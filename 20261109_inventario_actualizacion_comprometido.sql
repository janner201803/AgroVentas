-- HU-18 Consultar inventario: fecha de ultima actualizacion y stock comprometido.
--
-- Requiere, en este orden:
--   20261020_pedidos_fecha_hora_inventario.sql
--   20261101_catalogo_productos_inventario_acumulable.sql
--   20261102_reserva_stock_pedidos.sql
--
-- NO ejecutar en la base compartida sin la revision de liderazgo tecnico y la
-- autorizacion del responsable de datos. La migracion es aditiva: agrega una
-- columna, un trigger y una funcion de consulta; no borra ni modifica datos.

-- 1. Fecha de la ultima actualizacion de existencias.
-- Se agrega sin valor por defecto para no inventar fechas en las filas que ya
-- existen: quedan en NULL ("sin registro") hasta su proximo cambio.
alter table public.inventario
  add column if not exists actualizado_en timestamptz;

alter table public.inventario
  alter column actualizado_en set default now();

create or replace function public.inventario_marcar_actualizacion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.cantidad is distinct from old.cantidad then
    new.actualizado_en := now();
  end if;
  return new;
end;
$$;

revoke all on function public.inventario_marcar_actualizacion() from public, anon, authenticated;

-- Cubre todas las vias que cambian la cantidad: agregar_existencias (insert y
-- on conflict update), crear_pedido_con_reserva y la devolucion/reactivacion
-- de reservas al cambiar el estado de un pedido.
drop trigger if exists inventario_marcar_actualizacion on public.inventario;
create trigger inventario_marcar_actualizacion
  before insert or update of cantidad on public.inventario
  for each row
  execute function public.inventario_marcar_actualizacion();

-- 2. Resumen administrativo del inventario.
-- inventario.cantidad ya es el DISPONIBLE: crear_pedido_con_reserva lo descuenta
-- al registrar el pedido. El COMPROMETIDO es lo reservado en
-- reservas_stock_pedidos y el TOTAL es la suma de ambos.
-- Limites conocidos (ver PR):
--   * Los pedidos anteriores a 20261102_reserva_stock_pedidos.sql no tienen
--     reserva y no se cuentan como comprometidos.
--   * Una reserva solo se libera al cancelar o rechazar. Cuando exista el flujo
--     de despacho/entrega, debera liberarla; hasta entonces un pedido entregado
--     seguiria contando como comprometido.
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
  -- Misma regla administrativa que agregar_existencias. Si se aprueba un rol de
  -- empleado, se debe ampliar aqui y en es_administrador().
  if not public.es_administrador() then
    raise exception using errcode = '42501', message = 'Solo el administrador puede consultar el resumen del inventario';
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
