-- Reserva de bloques de entrega. El inventario y su catalogo se preparan en
-- 20261101_catalogo_productos_inventario_acumulable.sql.

alter table public.pedidos
  add column if not exists hora_entrega time;

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@gmail.com';
$$;

revoke all on function public.es_administrador() from public;
grant execute on function public.es_administrador() to authenticated;

-- Un bloque no puede reservarse dos veces, incluso si dos usuarios lo envían a la vez.
-- Los pedidos históricos sin hora quedan fuera hasta que se les asigne una.
create unique index if not exists pedidos_fecha_hora_activos_uidx
  on public.pedidos (fecha_entrega, hora_entrega)
  where hora_entrega is not null and lower(estado) not in ('cancelado', 'rechazado');

create index if not exists pedidos_fecha_entrega_idx
  on public.pedidos (fecha_entrega);

-- La disponibilidad muestra solo horas, no expone pedidos ni datos de otros clientes.
create or replace function public.horarios_ocupados(p_fecha date)
returns table (hora_entrega time)
language sql
security definer
set search_path = public
as $$
  select p.hora_entrega
  from public.pedidos p
  where p.fecha_entrega = p_fecha
    and p.hora_entrega is not null
    and lower(p.estado) not in ('cancelado', 'rechazado');
$$;

revoke all on function public.horarios_ocupados(date) from public;
grant execute on function public.horarios_ocupados(date) to authenticated;
