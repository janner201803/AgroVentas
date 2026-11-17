-- HU-17 / HU-18: el Empleado consulta el inventario y registra entradas.
--
-- Requiere, en este orden:
--   20261101_catalogo_productos_inventario_acumulable.sql
--   20261102_reserva_stock_pedidos.sql
--   20261109_inventario_actualizacion_comprometido.sql
--   20261115_roles_perfiles.sql   (crea public.es_personal())
--
-- Solo cambia la regla de permiso de dos funciones; el resto de su cuerpo es
-- identico al de las migraciones que las crearon. El catalogo (public.productos:
-- nombre, unidad, precio) sigue siendo exclusivo del Propietario.
--
-- NO ejecutar en la base compartida sin la revision de liderazgo tecnico y la
-- autorizacion del responsable de datos.

create or replace function public.agregar_existencias(
  p_id_producto bigint,
  p_cantidad double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_unidad text;
  v_unidad_normalizada text;
  v_precio double precision;
  v_stock public.inventario%rowtype;
  v_ya_existia boolean;
begin
  if p_id_producto is null or p_id_producto <= 0 then
    raise exception using errcode = '22023', message = 'Selecciona un producto valido del catalogo';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception using errcode = '22023', message = 'La cantidad a sumar debe ser mayor que cero';
  end if;
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el Propietario o un Empleado pueden registrar entradas de inventario';
  end if;

  select nombre, unidad, precio into v_nombre, v_unidad, v_precio
    from public.productos where id = p_id_producto;
  if not found then
    raise exception using errcode = 'P0002', message = 'El producto seleccionado no existe en el catalogo';
  end if;
  if v_precio is null or v_precio <= 0 then
    raise exception using errcode = '22023', message = 'Configura un precio mayor que cero para este producto en el catalogo';
  end if;

  v_unidad_normalizada := lower(trim(v_unidad));
  if v_unidad_normalizada in ('kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos') then
    v_unidad_normalizada := 'kg';
    if abs(p_cantidad * 10 - round(p_cantidad * 10)) > 0.00000001 then
      raise exception using errcode = '22023', message = 'La cantidad en kg debe usar incrementos de 0,1 kg';
    end if;
  elsif v_unidad_normalizada in ('und', 'unidad', 'unidades') then
    v_unidad_normalizada := 'und';
    if p_cantidad <> trunc(p_cantidad) then
      raise exception using errcode = '22023', message = 'La cantidad de unidades debe ser un numero entero';
    end if;
  else
    raise exception using errcode = '22023', message = 'La unidad del producto no es valida';
  end if;

  select exists(
    select 1 from public.inventario where id_producto = p_id_producto
  ) into v_ya_existia;

  insert into public.inventario (id_producto, cantidad)
    values (p_id_producto, p_cantidad)
    on conflict (id_producto) do update
      set cantidad = inventario.cantidad + excluded.cantidad
    returning * into v_stock;

  return jsonb_build_object(
    'id', v_stock.id,
    'id_producto', v_stock.id_producto,
    'nombre', v_nombre,
    'cantidad', v_stock.cantidad,
    'precio', v_precio,
    'unidad', v_unidad,
    'und', v_unidad_normalizada,
    'creado', not v_ya_existia
  );
end;
$$;

revoke all on function public.agregar_existencias(bigint, double precision) from public;
grant execute on function public.agregar_existencias(bigint, double precision) to authenticated;

create or replace function public.inventario_resumen()
returns table (
  id bigint,
  id_producto bigint,
  nombre text,
  unidad text,
  precio double precision,
  disponible double precision,
  comprometido double precision,
  total double precision,
  actualizado_en timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- HU-18: Propietario y Empleado consultan el inventario.
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el Propietario o un Empleado pueden consultar el resumen del inventario';
  end if;

  return query
  select
    i.id::bigint,
    i.id_producto::bigint,
    p.nombre::text,
    p.unidad::text,
    p.precio::double precision,
    i.cantidad::double precision as disponible,
    coalesce(r.comprometido, 0)::double precision as comprometido,
    (i.cantidad + coalesce(r.comprometido, 0))::double precision as total,
    i.actualizado_en
  from public.inventario i
  join public.productos p on p.id = i.id_producto
  left join (
    select rs.id_inventario, sum(rs.cantidad) as comprometido
    from public.reservas_stock_pedidos rs
    group by rs.id_inventario
  ) r on r.id_inventario = i.id
  order by p.nombre;
end;
$$;

revoke all on function public.inventario_resumen() from public, anon;
grant execute on function public.inventario_resumen() to authenticated;
