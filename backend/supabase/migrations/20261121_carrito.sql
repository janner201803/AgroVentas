begin;

-- Antes del carrito, cada pedido tenía una sola variedad. Los pedidos históricos
-- conservan sus columnas originales. Las nuevas líneas guardan el precio al comprar.
alter table public.pedidos add column lineas jsonb;
alter table public.reservas_stock_pedidos drop constraint reservas_stock_pedidos_pkey;
alter table public.reservas_stock_pedidos add primary key (id_pedido, id_inventario);

create or replace function public.crear_pedido_carrito(
  p_id_pedido character varying,
  p_lineas jsonb,
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
  p_id_producto bigint;
  p_cantidad double precision;
  v_nombre text;
  v_total numeric := 0;
  v_subtotal numeric;
  v_lineas jsonb := '[]'::jsonb;
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
  if p_id_pedido is null or jsonb_typeof(p_lineas) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Carrito inválido';
  end if;
  if jsonb_array_length(p_lineas) = 0 then
    raise exception using errcode = '22023', message = 'El carrito está vacío';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_lineas) as l(id_producto bigint)
             group by l.id_producto having count(*) > 1) then
    raise exception using errcode = '22023', message = 'Producto repetido en el carrito';
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
    or (p_fecha_entrega = v_ahora_local::date and p_fecha_entrega + p_hora_entrega < date_trunc('minute', v_ahora_local) + interval '40 minutes') then
    raise exception using errcode = '22023', message = 'Selecciona un bloque de entrega con suficiente anticipación.';
  end if;

  -- Todas las compras bloquean los saldos en el mismo orden.
  for p_id_producto, p_cantidad in
    select l.id_producto, l.cantidad from jsonb_to_recordset(p_lineas)
      as l(id_producto bigint, cantidad double precision) order by l.id_producto
  loop
    if p_cantidad is null or p_cantidad <= 0 or p_cantidad::text in ('NaN','Infinity','-Infinity') then
      raise exception using errcode = '22023', message = 'Cantidad inválida';
    end if;
    select *
      into v_inventario
      from public.inventario
      where id = p_id_producto
      for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'El producto seleccionado no está disponible';
    end if;

    select nombre, unidad, precio
      into v_nombre, v_unidad, v_precio
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

    v_subtotal := round(v_precio::numeric * p_cantidad::numeric);
    v_total := v_total + v_subtotal;
    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object(
      'id_producto', p_id_producto, 'nombre', v_nombre, 'unidad', v_unidad,
      'cantidad', p_cantidad, 'precio', v_precio, 'subtotal', v_subtotal));
  end loop;

  insert into public.pedidos (
    id, valor, cantidad, fecha_entrega, hora_entrega, metodo_pago,
    estado, id_producto, id_usuario, lineas
  )
  values (
    p_id_pedido,
    v_total,
    (v_lineas->0->>'cantidad')::double precision,
    p_fecha_entrega,
    p_hora_entrega,
    p_metodo_pago,
    'pendiente',
    (v_lineas->0->>'id_producto')::bigint,
    v_usuario_id, v_lineas
  )
  returning * into v_pedido;

  insert into public.reservas_stock_pedidos (id_pedido, id_inventario, cantidad)
  select v_pedido.id, l.id_producto, l.cantidad from jsonb_to_recordset(v_lineas) as l(id_producto bigint, cantidad double precision);

  return to_jsonb(v_pedido);
end;
$$;

revoke all on function public.crear_pedido_carrito(character varying, jsonb, date, time, text)
  from public, anon;
grant execute on function public.crear_pedido_carrito(character varying, jsonb, date, time, text)
  to authenticated;

create or replace function public.gestionar_reserva_stock_pedido()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  linea record;
begin
  if new.estado = 'entregado' then
    delete from public.reservas_stock_pedidos where id_pedido = old.id;
  elsif new.estado = 'cancelado' then
    for linea in select id_inventario, cantidad from public.reservas_stock_pedidos
      where id_pedido = old.id order by id_inventario
    loop
      update public.inventario set cantidad = cantidad + linea.cantidad where id = linea.id_inventario;
    end loop;
    delete from public.reservas_stock_pedidos where id_pedido = old.id;
  elsif old.estado = 'cancelado' then
    for linea in select * from jsonb_to_recordset(coalesce(old.lineas,
      jsonb_build_array(jsonb_build_object('id_producto', old.id_producto, 'cantidad', old.cantidad))))
      as l(id_producto bigint, cantidad double precision) order by l.id_producto
    loop
      update public.inventario set cantidad = cantidad - linea.cantidad
        where id = linea.id_producto and cantidad >= linea.cantidad;
      if not found then
        raise exception using errcode = 'P0001', message = 'Stock insuficiente para reactivar el pedido';
      end if;
      insert into public.reservas_stock_pedidos values (old.id, linea.id_producto, linea.cantidad);
    end loop;
  end if;
  return new;
end;
$$;

commit;
