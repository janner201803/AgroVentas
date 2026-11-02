-- Reserva atomica de inventario al registrar pedidos.
-- Los pedidos anteriores a esta migracion no se reservan automaticamente.

create table if not exists public.reservas_stock_pedidos (
  id_pedido character varying primary key references public.pedidos(id) on delete restrict,
  id_inventario bigint not null references public.inventario(id) on delete restrict,
  cantidad double precision not null check (cantidad > 0)
);

alter table public.reservas_stock_pedidos enable row level security;
revoke all on table public.reservas_stock_pedidos from public, anon, authenticated;

create or replace function public.crear_pedido_con_reserva(
  p_id_pedido character varying,
  p_id_producto bigint,
  p_cantidad double precision,
  p_fecha_entrega date,
  p_hora_entrega time,
  p_metodo_pago text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario_id uuid;
  v_inventario public.inventario%rowtype;
  v_unidad text;
  v_unidad_normalizada text;
  v_precio double precision;
  v_pedido public.pedidos%rowtype;
  v_ahora_local timestamp without time zone;
begin
  v_usuario_id := auth.uid();
  if v_usuario_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesión para registrar un pedido';
  end if;
  if p_id_pedido is null or p_id_producto is null or p_id_producto <= 0 then
    raise exception using errcode = '22023', message = 'Selecciona un producto válido';
  end if;
  if p_cantidad is null or p_cantidad <= 0 or p_cantidad::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using errcode = '22023', message = 'La cantidad debe ser mayor que cero';
  end if;
  if p_metodo_pago is null or p_metodo_pago not in ('efectivo', 'consignacion') then
    raise exception using errcode = '22023', message = 'Selecciona un método de pago válido';
  end if;
  if p_fecha_entrega is null or p_hora_entrega is null
    or p_hora_entrega < time '08:00'
    or p_hora_entrega > time '16:00'
    or date_part('minute', p_hora_entrega) <> 0
    or date_part('second', p_hora_entrega) <> 0 then
    raise exception using errcode = '22023', message = 'Selecciona una fecha y un horario de entrega válidos';
  end if;

  v_ahora_local := now() at time zone 'America/Bogota';
  if p_fecha_entrega < v_ahora_local::date
    or (p_fecha_entrega = v_ahora_local::date and p_hora_entrega <= v_ahora_local::time) then
    raise exception using errcode = '22023', message = 'Ese horario ya pasó. Selecciona una fecha y hora posteriores.';
  end if;

  select *
    into v_inventario
    from public.inventario
    where id = p_id_producto
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'El producto seleccionado no está disponible';
  end if;

  select unidad, precio
    into v_unidad, v_precio
    from public.productos
    where id = v_inventario.id_producto;
  if not found then
    raise exception using errcode = 'P0002', message = 'El producto seleccionado no existe en el catálogo';
  end if;
  if v_inventario.cantidad < p_cantidad then
    raise exception using errcode = 'P0001', message = 'La cantidad solicitada supera el inventario disponible';
  end if;
  if v_precio is null or v_precio <= 0 or v_precio::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using errcode = '22023', message = 'El producto no tiene un precio válido configurado';
  end if;

  v_unidad_normalizada := lower(trim(v_unidad));
  if v_unidad_normalizada in ('kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos') then
    if abs(p_cantidad * 10 - round(p_cantidad * 10)) > 0.00000001 then
      raise exception using errcode = '22023', message = 'La cantidad en kg debe usar incrementos de 0,1 kg';
    end if;
  elsif v_unidad_normalizada in ('und', 'unidad', 'unidades') then
    if p_cantidad <> trunc(p_cantidad) then
      raise exception using errcode = '22023', message = 'La cantidad solicitada debe ser un número entero de unidades';
    end if;
  else
    raise exception using errcode = '22023', message = 'El producto no tiene una unidad válida configurada';
  end if;

  update public.inventario
    set cantidad = cantidad - p_cantidad
    where id = p_id_producto and cantidad >= p_cantidad;
  if not found then
    raise exception using errcode = 'P0001', message = 'La cantidad solicitada supera el inventario disponible';
  end if;

  insert into public.pedidos (
    id, valor, cantidad, fecha_entrega, hora_entrega, metodo_pago,
    estado, id_producto, id_usuario
  )
  values (
    p_id_pedido,
    round(v_precio::numeric * p_cantidad::numeric),
    p_cantidad,
    p_fecha_entrega,
    p_hora_entrega,
    p_metodo_pago,
    'pendiente',
    p_id_producto,
    v_usuario_id
  )
  returning * into v_pedido;

  insert into public.reservas_stock_pedidos (id_pedido, id_inventario, cantidad)
  values (v_pedido.id, p_id_producto, p_cantidad);

  return to_jsonb(v_pedido);
end;
$$;

revoke all on function public.crear_pedido_con_reserva(character varying, bigint, double precision, date, time, text)
  from public, anon;
grant execute on function public.crear_pedido_con_reserva(character varying, bigint, double precision, date, time, text)
  to authenticated;

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

  if v_estado_anterior not in ('cancelado', 'rechazado')
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

drop trigger if exists pedidos_gestionar_reserva_stock on public.pedidos;
create trigger pedidos_gestionar_reserva_stock
  before update of estado on public.pedidos
  for each row
  when (old.estado is distinct from new.estado)
  execute function public.gestionar_reserva_stock_pedido();
