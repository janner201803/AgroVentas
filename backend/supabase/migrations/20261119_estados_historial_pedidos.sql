-- HU-12 Gestionar estado del pedido / HU-13 Consultar pedidos pendientes.
--
-- Requiere, en este orden:
--   20261020_pedidos_fecha_hora_inventario.sql
--   20261101_catalogo_productos_inventario_acumulable.sql
--   20261102_reserva_stock_pedidos.sql
--   20261115_roles_perfiles.sql   (es_personal(), perfiles)
--
-- 1. Deja los pedidos con los cuatro estados de las historias:
--    pendiente, en_preparacion, entregado, cancelado.
-- 2. Historial de cambios de estado (fecha, responsable y nota), registrado por
--    triggers: también queda trazado un cambio hecho desde el Table Editor.
-- 3. Al pasar a "entregado" se libera la reserva de stock (la mercancía salió;
--    no se devuelve al inventario). Al cancelar se devuelve como antes.
-- 4. Funciones para el personal: listar pedidos con cliente y producto, cambiar
--    estado validando la transición, y consultar el historial de un pedido.

-- ---------------------------------------------------------------------------
-- 1. Estados
-- ---------------------------------------------------------------------------

-- Equivalencias de los estados que usaba el código anterior.
update public.pedidos set estado = 'en_preparacion'
  where lower(trim(estado)) in ('confirmado', 'preparado', 'en preparacion', 'en preparación', 'en_preparacion')
    and estado is distinct from 'en_preparacion';
update public.pedidos set estado = 'cancelado'
  where lower(trim(estado)) = 'rechazado';
update public.pedidos set estado = lower(trim(estado))
  where lower(trim(estado)) in ('pendiente', 'entregado', 'cancelado')
    and estado <> lower(trim(estado));
update public.pedidos set estado = 'pendiente' where estado is null or trim(estado) = '';

do $$
declare
  v_desconocidos text;
begin
  select string_agg(distinct estado, ', ') into v_desconocidos
    from public.pedidos
    where estado not in ('pendiente', 'en_preparacion', 'entregado', 'cancelado');
  if v_desconocidos is not null then
    raise exception 'Hay pedidos con estados desconocidos (%). Asígnales uno de: pendiente, en_preparacion, entregado, cancelado.', v_desconocidos;
  end if;
end;
$$;

alter table public.pedidos alter column estado set default 'pendiente';
alter table public.pedidos alter column estado set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pedidos_estado_valido' and conrelid = 'public.pedidos'::regclass
  ) then
    alter table public.pedidos
      add constraint pedidos_estado_valido
      check (estado in ('pendiente', 'en_preparacion', 'entregado', 'cancelado'));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Historial de estados
-- ---------------------------------------------------------------------------

create table if not exists public.pedidos_historial_estados (
  id bigint generated always as identity primary key,
  id_pedido character varying not null references public.pedidos(id) on delete cascade,
  estado_anterior text,
  estado_nuevo text not null,
  id_responsable uuid references auth.users(id) on delete set null,
  nota text,
  creado_en timestamptz not null default now()
);

create index if not exists pedidos_historial_estados_pedido_idx
  on public.pedidos_historial_estados (id_pedido, creado_en desc);

-- Solo se lee con las funciones de abajo; nadie escribe directamente.
alter table public.pedidos_historial_estados enable row level security;
revoke all on table public.pedidos_historial_estados from public, anon, authenticated;

create or replace function public.registrar_historial_estado_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nota text := nullif(trim(coalesce(current_setting('agroventas.nota_estado', true), '')), '');
begin
  if tg_op = 'INSERT' then
    insert into public.pedidos_historial_estados (id_pedido, estado_anterior, estado_nuevo, id_responsable, nota)
    values (new.id, null, new.estado, auth.uid(), coalesce(v_nota, 'Pedido registrado'));
  elsif new.estado is distinct from old.estado then
    insert into public.pedidos_historial_estados (id_pedido, estado_anterior, estado_nuevo, id_responsable, nota)
    values (new.id, old.estado, new.estado, auth.uid(), v_nota);
  end if;
  return new;
end;
$$;

revoke all on function public.registrar_historial_estado_pedido() from public, anon, authenticated;

drop trigger if exists pedidos_historial_al_crear on public.pedidos;
create trigger pedidos_historial_al_crear
  after insert on public.pedidos
  for each row
  execute function public.registrar_historial_estado_pedido();

drop trigger if exists pedidos_historial_al_cambiar_estado on public.pedidos;
create trigger pedidos_historial_al_cambiar_estado
  after update of estado on public.pedidos
  for each row
  when (old.estado is distinct from new.estado)
  execute function public.registrar_historial_estado_pedido();

-- ---------------------------------------------------------------------------
-- 3. Reserva de stock: igual que en 20261102, más la liberación al entregar.
-- ---------------------------------------------------------------------------

create or replace function public.gestionar_reserva_stock_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id_inventario bigint;
  v_cantidad double precision;
  v_estado_anterior text;
  v_estado_nuevo text;
begin
  v_estado_anterior := lower(trim(coalesce(old.estado, '')));
  v_estado_nuevo := lower(trim(coalesce(new.estado, '')));

  if v_estado_anterior not in ('cancelado', 'rechazado', 'entregado')
    and v_estado_nuevo = 'entregado' then
    -- HU-12: la mercancía se entregó; la reserva deja de contar como comprometida.
    delete from public.reservas_stock_pedidos where id_pedido = old.id;
  elsif v_estado_anterior not in ('cancelado', 'rechazado')
    and v_estado_nuevo in ('cancelado', 'rechazado') then
    delete from public.reservas_stock_pedidos
      where id_pedido = old.id
      returning id_inventario, cantidad into v_id_inventario, v_cantidad;

    if found then
      update public.inventario
        set cantidad = cantidad + v_cantidad
        where id = v_id_inventario;
      if not found then
        raise exception using errcode = 'P0002', message = 'No se encontró el inventario para devolver el stock reservado';
      end if;
    end if;
  elsif v_estado_anterior in ('cancelado', 'rechazado')
    and v_estado_nuevo not in ('cancelado', 'rechazado') then
    update public.inventario
      set cantidad = cantidad - old.cantidad
      where id = old.id_producto and cantidad >= old.cantidad;
    if not found then
      raise exception using errcode = 'P0001', message = 'No hay inventario suficiente para reactivar este pedido';
    end if;

    insert into public.reservas_stock_pedidos (id_pedido, id_inventario, cantidad)
    values (old.id, old.id_producto, old.cantidad);
  end if;

  return new;
end;
$$;

revoke all on function public.gestionar_reserva_stock_pedido() from public, anon, authenticated;

-- Pedidos que ya estaban entregados antes de esta migración.
delete from public.reservas_stock_pedidos r
  using public.pedidos p
  where p.id = r.id_pedido and p.estado = 'entregado';

-- ---------------------------------------------------------------------------
-- 4. Funciones para el personal
-- ---------------------------------------------------------------------------

-- Cambia el estado validando la transición. Transiciones permitidas:
--   pendiente      -> en_preparacion, cancelado
--   en_preparacion -> pendiente, entregado, cancelado
--   entregado y cancelado son estados finales.
create or replace function public.cambiar_estado_pedido(
  p_id_pedido character varying,
  p_estado text,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actual text;
  v_pedido public.pedidos%rowtype;
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el Propietario o un Empleado pueden cambiar el estado de un pedido';
  end if;
  if p_estado is null or p_estado not in ('pendiente', 'en_preparacion', 'entregado', 'cancelado') then
    raise exception using errcode = '22023', message = 'Selecciona un estado válido';
  end if;
  if p_nota is not null and length(p_nota) > 500 then
    raise exception using errcode = '22023', message = 'La nota no puede superar 500 caracteres';
  end if;

  select estado into v_actual from public.pedidos where id = p_id_pedido for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'El pedido no existe';
  end if;

  if v_actual = p_estado then
    raise exception using errcode = 'P0001', message = 'El pedido ya está en ese estado';
  end if;
  if not (
    (v_actual = 'pendiente' and p_estado in ('en_preparacion', 'cancelado'))
    or (v_actual = 'en_preparacion' and p_estado in ('pendiente', 'entregado', 'cancelado'))
  ) then
    raise exception using errcode = 'P0001',
      message = format('No se puede pasar un pedido de "%s" a "%s"', v_actual, p_estado);
  end if;

  perform set_config('agroventas.nota_estado', coalesce(p_nota, ''), true);

  update public.pedidos set estado = p_estado
    where id = p_id_pedido
    returning * into v_pedido;

  perform set_config('agroventas.nota_estado', '', true);
  return to_jsonb(v_pedido);
end;
$$;

revoke all on function public.cambiar_estado_pedido(character varying, text, text) from public, anon;
grant execute on function public.cambiar_estado_pedido(character varying, text, text) to authenticated;

-- Pedidos con producto, cliente y último cambio, para las pantallas del personal.
-- Devuelve jsonb para no depender de columnas opcionales de pedidos.
create or replace function public.pedidos_personal(
  p_desde date default null,
  p_hasta date default null
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el Propietario o un Empleado pueden consultar los pedidos';
  end if;

  return query
  select to_jsonb(p) || jsonb_build_object(
    'producto_nombre', pr.nombre,
    'producto_unidad', pr.unidad,
    'cliente_nombre', cli.nombre,
    'cliente_correo', cli.correo,
    'cliente_celular', cli.celular,
    'ultimo_cambio_en', h.creado_en,
    'ultimo_cambio_por', coalesce(resp.nombre, resp.correo)
  )
  from public.pedidos p
  left join public.inventario i on i.id = p.id_producto
  left join public.productos pr on pr.id = i.id_producto
  left join public.perfiles cli on cli.id::text = p.id_usuario::text
  left join lateral (
    select he.creado_en, he.id_responsable
    from public.pedidos_historial_estados he
    where he.id_pedido = p.id
    order by he.creado_en desc, he.id desc
    limit 1
  ) h on true
  left join public.perfiles resp on resp.id = h.id_responsable
  where (p_desde is null or p.fecha_entrega >= p_desde)
    and (p_hasta is null or p.fecha_entrega <= p_hasta)
  order by p.fecha_entrega, p.hora_entrega nulls last;
end;
$$;

revoke all on function public.pedidos_personal(date, date) from public, anon;
grant execute on function public.pedidos_personal(date, date) to authenticated;

-- Historial de un pedido: lo ve el personal y el cliente dueño del pedido.
-- Al cliente no se le muestra el correo de quien hizo el cambio.
create or replace function public.historial_estados_pedido(p_id_pedido character varying)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_personal boolean := public.es_personal();
begin
  if not v_personal and not exists (
    select 1 from public.pedidos p
    where p.id = p_id_pedido and p.id_usuario::text = auth.uid()::text
  ) then
    raise exception using errcode = '42501', message = 'No puedes consultar el historial de este pedido';
  end if;

  return query
  select jsonb_build_object(
    'id', he.id,
    'estado_anterior', he.estado_anterior,
    'estado_nuevo', he.estado_nuevo,
    'nota', he.nota,
    'creado_en', he.creado_en,
    'responsable', case
      when resp.id is null then 'Sistema'
      when v_personal then coalesce(resp.nombre, resp.correo)
      when resp.rol in ('propietario', 'empleado') then 'Comercializadora'
      else 'Tú'
    end
  )
  from public.pedidos_historial_estados he
  left join public.perfiles resp on resp.id = he.id_responsable
  where he.id_pedido = p_id_pedido
  order by he.creado_en, he.id;
end;
$$;

revoke all on function public.historial_estados_pedido(character varying) from public, anon;
grant execute on function public.historial_estados_pedido(character varying) to authenticated;
