begin;

create or replace function public.reportes_resumen_propietario(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  hoy_colombia date := (now() at time zone 'America/Bogota')::date;
  resultado jsonb;
begin
  if not public.es_administrador() then
    raise exception using errcode = '42501', message = 'Solo el Propietario puede consultar el tablero y los reportes';
  end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception using errcode = '22023', message = 'Selecciona un rango de fechas válido';
  end if;

  with ventas_periodo as (
    select v.*
    from public.ventas v
    where (v.creado_en at time zone 'America/Bogota')::date between p_desde and p_hasta
  ), productos_periodo as (
    select
      linea->>'id_producto' as id_producto,
      coalesce(nullif(linea->>'nombre', ''), 'Producto #' || coalesce(linea->>'id_producto', '?')) as nombre,
      coalesce(linea->>'unidad', '') as unidad,
      sum(coalesce(nullif(linea->>'cantidad', '')::numeric, 0)) as cantidad,
      sum(coalesce(nullif(linea->>'subtotal', '')::numeric, 0)) as total
    from ventas_periodo v
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(v.lineas) = 'array' then v.lineas else '[]'::jsonb end
    ) as detalle(linea)
    group by linea->>'id_producto', coalesce(nullif(linea->>'nombre', ''), 'Producto #' || coalesce(linea->>'id_producto', '?')), coalesce(linea->>'unidad', '')
  ), clientes_periodo as (
    select
      c.id as cliente_id,
      coalesce(nullif(trim(c.nombre), ''), nullif(trim(per.nombre), ''), nullif(trim(per.correo), ''), 'Cliente sin ficha') as nombre,
      count(v.id) as ventas,
      sum(v.total) as total
    from ventas_periodo v
    left join public.clientes c on c.id = v.cliente_id
    left join public.pedidos ped on ped.id = v.pedido_id
    left join public.perfiles per on per.id = coalesce(c.cuenta_id, ped.id_usuario)
    group by c.id, coalesce(nullif(trim(c.nombre), ''), nullif(trim(per.nombre), ''), nullif(trim(per.correo), ''), 'Cliente sin ficha')
  )
  select jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'ventas', jsonb_build_object(
      'cantidad', (select count(*) from ventas_periodo),
      'total', coalesce((select sum(total) from ventas_periodo), 0),
      'promedio', coalesce((select avg(total) from ventas_periodo), 0)
    ),
    'por_metodo_pago', coalesce((
      select jsonb_agg(jsonb_build_object('metodo_pago', x.metodo_pago, 'cantidad', x.cantidad, 'total', x.total)
        order by x.total desc)
      from (
        select metodo_pago, count(*) as cantidad, sum(total) as total
        from ventas_periodo group by metodo_pago
      ) x
    ), '[]'::jsonb),
    'productos_mas_vendidos', coalesce((
      select jsonb_agg(jsonb_build_object('id_producto', x.id_producto, 'nombre', x.nombre, 'unidad', x.unidad,
        'cantidad', x.cantidad, 'total', x.total) order by x.cantidad desc, x.total desc)
      from (select * from productos_periodo order by cantidad desc, total desc limit 10) x
    ), '[]'::jsonb),
    'ventas_por_cliente', coalesce((
      select jsonb_agg(jsonb_build_object('cliente_id', x.cliente_id, 'nombre', x.nombre,
        'ventas', x.ventas, 'total', x.total) order by x.total desc)
      from (select * from clientes_periodo order by total desc limit 10) x
    ), '[]'::jsonb),
    'cartera', jsonb_build_object(
      'cuentas_abiertas', (select count(*) from public.cuentas_por_cobrar where estado <> 'pagada'),
      'saldo_pendiente', coalesce((select sum(saldo_pendiente) from public.cuentas_por_cobrar where estado <> 'pagada'), 0),
      'cuentas_en_mora', (select count(*) from public.cuentas_por_cobrar where estado <> 'pagada' and fecha_vencimiento < hoy_colombia),
      'saldo_en_mora', coalesce((select sum(saldo_pendiente) from public.cuentas_por_cobrar where estado <> 'pagada' and fecha_vencimiento < hoy_colombia), 0)
    ),
    'pedidos', jsonb_build_object(
      'pendientes', (select count(*) from public.pedidos where estado = 'pendiente'),
      'en_preparacion', (select count(*) from public.pedidos where estado = 'en_preparacion'),
      'entregas_hoy', (select count(*) from public.pedidos where fecha_entrega = hoy_colombia and estado in ('pendiente', 'en_preparacion'))
    ),
    'inventario', jsonb_build_object(
      'productos_sin_existencias', (select count(*) from public.productos p left join public.inventario i on i.id_producto = p.id where coalesce(i.cantidad, 0) <= 0),
      'productos', coalesce((
        select jsonb_agg(jsonb_build_object('id_producto', p.id, 'nombre', p.nombre,
          'unidad', p.unidad, 'disponible', coalesce(i.cantidad, 0)) order by p.nombre)
        from public.productos p
        left join public.inventario i on i.id_producto = p.id
        where coalesce(i.cantidad, 0) <= 0
      ), '[]'::jsonb)
    )
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.reportes_resumen_propietario(date, date) from public, anon;
grant execute on function public.reportes_resumen_propietario(date, date) to authenticated;

commit;
