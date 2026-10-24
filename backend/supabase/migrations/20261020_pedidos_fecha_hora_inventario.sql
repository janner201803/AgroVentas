-- Preparación para catálogo real y reserva de bloques de entrega.
-- El precio corresponde a una unidad de medida del producto (kg o und).

alter table public.inventario
  add column if not exists precio numeric(12, 2),
  add column if not exists und text not null default 'kg';

update public.inventario set und = 'kg' where und is null;
alter table public.inventario alter column und set default 'kg';
alter table public.inventario alter column und set not null;

-- Retira los nombres anteriores si quedaron de pruebas del esquema.
alter table public.inventario
  drop column if exists unidad,
  drop column if exists activo;

alter table public.pedidos
  add column if not exists hora_entrega time;

-- La escritura de inventario se limita al correo administrativo del proyecto.
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

alter table public.inventario enable row level security;
grant select, insert on public.inventario to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'inventario' and policyname = 'inventario_lectura_autenticados') then
    create policy inventario_lectura_autenticados on public.inventario
      for select to authenticated using (true);
  end if;
  drop policy if exists inventario_insertar_admin on public.inventario;
  create policy inventario_insertar_admin on public.inventario
    for insert to authenticated with check (public.es_administrador());
end $$;

do $$
declare secuencia text;
begin
  secuencia := pg_get_serial_sequence('public.inventario', 'id');
  if secuencia is not null then
    execute format('grant usage, select on sequence %s to authenticated', secuencia);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inventario_precio_positivo_check') then
    alter table public.inventario add constraint inventario_precio_positivo_check
      check (precio is null or precio > 0);
  end if;
end $$;

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
