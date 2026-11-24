begin;

alter table public.pedidos
  add column if not exists cliente_id bigint references public.clientes(id) on update cascade on delete set null,
  add column if not exists canal_origen text not null default 'portal'
    check (canal_origen in ('portal', 'whatsapp', 'telefono', 'presencial')),
  add column if not exists registrado_por uuid default auth.uid() references auth.users(id) on delete set null;

update public.pedidos p
set cliente_id = c.id
from public.clientes c
where p.cliente_id is null and p.id_usuario = c.cuenta_id;

update public.pedidos
set registrado_por = id_usuario
where registrado_por is null and id_usuario is not null;

create index if not exists pedidos_cliente_fecha_idx
  on public.pedidos (cliente_id, fecha_pedido desc);

create or replace function public.crear_pedido_interno(
  p_id_pedido character varying,
  p_cliente_id bigint,
  p_lineas jsonb,
  p_fecha_entrega date,
  p_hora_entrega time,
  p_canal_origen text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ficha public.clientes%rowtype;
  pedido public.pedidos%rowtype;
  nota_canal text;
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el personal puede registrar pedidos internos';
  end if;
  if p_canal_origen is null or p_canal_origen not in ('whatsapp', 'telefono', 'presencial') then
    raise exception using errcode = '22023', message = 'Selecciona WhatsApp, teléfono o presencial';
  end if;
  if p_cliente_id is null or p_cliente_id <= 0 then
    raise exception using errcode = '22023', message = 'Selecciona una ficha de cliente válida';
  end if;

  select * into ficha
  from public.clientes
  where id = p_cliente_id and activo
  for key share;
  if not found then
    raise exception using errcode = 'P0002', message = 'La ficha no existe o está inactiva';
  end if;

  nota_canal := case p_canal_origen
    when 'whatsapp' then 'Pedido interno recibido por WhatsApp'
    when 'telefono' then 'Pedido interno recibido por teléfono'
    else 'Pedido interno recibido en persona'
  end;
  perform set_config('agroventas.nota_estado', nota_canal, true);

  -- Reutiliza la misma transacción que valida carrito, horario y stock.
  perform public.crear_pedido_carrito(
    p_id_pedido, p_lineas, p_fecha_entrega, p_hora_entrega, 'efectivo'
  );

  update public.pedidos
  set cliente_id = ficha.id,
      id_usuario = ficha.cuenta_id,
      registrado_por = auth.uid(),
      canal_origen = p_canal_origen,
      metodo_pago = null
  where id = p_id_pedido
  returning * into pedido;

  perform set_config('agroventas.nota_estado', '', true);
  return to_jsonb(pedido);
end;
$$;

-- Las ventas siguen ligándose a la ficha comercial aunque el cliente no tenga
-- una cuenta del portal (caso común en pedidos telefónicos/presenciales).
create or replace function public.registrar_venta_entregada() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  metodo text := current_setting('agroventas.pago_entrega', true);
  cliente bigint;
  ficha_activa boolean;
begin
  if not public.es_personal() then raise insufficient_privilege; end if;
  if metodo is null or metodo not in ('efectivo', 'transferencia', 'credito') then
    raise exception using errcode = '22023', message = 'Confirma el método de pago antes de entregar';
  end if;

  if new.cliente_id is not null then
    select id, activo into cliente, ficha_activa
      from public.clientes where id = new.cliente_id;
  elsif new.id_usuario is not null then
    select id, activo into cliente, ficha_activa
      from public.clientes where cuenta_id = new.id_usuario;
  end if;

  if metodo = 'credito' and (cliente is null or not ficha_activa) then
    raise exception using errcode = '22023',
      message = 'El crédito requiere una ficha comercial activa vinculada al pedido';
  end if;

  insert into public.ventas(pedido_id, cliente_id, metodo_pago, total, lineas, registrado_por)
    values(new.id, cliente, metodo, new.valor, coalesce(new.lineas, jsonb_build_array(jsonb_build_object(
      'id_producto', new.id_producto, 'cantidad', new.cantidad, 'subtotal', new.valor))), auth.uid());
  return new;
end;
$$;

-- Presenta la ficha comercial y el responsable real del registro al personal.
create or replace function public.pedidos_personal(p_desde date default null, p_hasta date default null)
returns setof jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select p || jsonb_build_object(
    'cliente_nombre', coalesce(c.nombre, p->>'cliente_nombre'),
    'cliente_correo', coalesce(per.correo, p->>'cliente_correo'),
    'cliente_celular', coalesce(c.telefono, p->>'cliente_celular'),
    'credito_habilitado', coalesce(c.activo, false),
    'canal_origen', coalesce(p->>'canal_origen', 'portal'),
    'registrado_por_nombre', coalesce(reg.nombre, reg.correo)
  ) || case when v.id is null then '{}'::jsonb else jsonb_build_object('metodo_pago', v.metodo_pago) end
  from public.pedidos_personal_base(p_desde, p_hasta) p
  left join lateral (
    select ficha.*
    from public.clientes ficha
    where ficha.id = nullif(p->>'cliente_id', '')::bigint
       or (p->>'cliente_id' is null and ficha.cuenta_id::text = p->>'id_usuario')
    order by case when ficha.id = nullif(p->>'cliente_id', '')::bigint then 0 else 1 end
    limit 1
  ) c on true
  left join public.perfiles per on per.id = c.cuenta_id
  left join public.perfiles reg on reg.id = nullif(p->>'registrado_por', '')::uuid
  left join public.ventas v on v.pedido_id = p->>'id';
$$;

revoke all on function public.crear_pedido_interno(character varying, bigint, jsonb, date, time, text)
  from public, anon;
grant execute on function public.crear_pedido_interno(character varying, bigint, jsonb, date, time, text)
  to authenticated;

commit;
