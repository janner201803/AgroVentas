-- HU-01 / HU-21: roles del sistema (Propietario, Empleado, Cliente).
--
-- Requiere las migraciones anteriores (20261020, 20261101, 20261102, 20261109).
--
-- Reemplaza la regla "es administrador si el correo es admin@gmail.com" por un
-- rol guardado en public.perfiles. public.es_administrador() conserva su nombre
-- y ahora significa "es Propietario activo", así que las políticas y funciones
-- existentes (productos, agregar_existencias, inventario_resumen) siguen
-- funcionando sin tocarlas.
--
-- NO ejecutar en la base compartida sin la revisión de liderazgo técnico y la
-- autorización del responsable de datos. Es aditiva: crea una tabla, funciones
-- y triggers; no borra datos. admin@gmail.com queda como Propietario.

-- 1. Perfil de cada cuenta.
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null default 'cliente'
    check (rol in ('propietario', 'empleado', 'cliente')),
  correo text,
  nombre text,
  celular text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists perfiles_rol_idx on public.perfiles (rol);

-- 2. Cada cuenta nueva recibe un perfil de Cliente. El rol NUNCA se toma de los
-- metadatos del registro (los escribe el propio usuario); solo nombre y celular.
-- El correo se copia de auth.users porque la app no puede leer esa tabla y la
-- pantalla de usuarios (HU-21) lo necesita para identificar cada cuenta.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.perfiles (id, correo, nombre, celular)
  values (
    new.id,
    lower(new.email),
    nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'nombre',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'celular', ''), '\D', '', 'g'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;

drop trigger if exists crear_perfil_al_registrarse on auth.users;
create trigger crear_perfil_al_registrarse
  after insert on auth.users
  for each row
  execute function public.crear_perfil_nuevo_usuario();

-- Si el usuario cambia su correo en Supabase Auth, el perfil lo refleja.
create or replace function public.sincronizar_correo_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.perfiles set correo = lower(new.email) where id = new.id;
  return new;
end;
$$;

revoke all on function public.sincronizar_correo_perfil() from public, anon, authenticated;

drop trigger if exists sincronizar_correo_perfil on auth.users;
create trigger sincronizar_correo_perfil
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sincronizar_correo_perfil();

-- 3. Cuentas que ya existían: perfil de Cliente; admin@gmail.com pasa a Propietario.
insert into public.perfiles (id, correo, nombre, celular)
select
  u.id,
  lower(u.email),
  nullif(trim(coalesce(
    u.raw_user_meta_data ->> 'nombre',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  )), ''),
  nullif(regexp_replace(coalesce(u.raw_user_meta_data ->> 'celular', ''), '\D', '', 'g'), '')
from auth.users u
on conflict (id) do update
  set correo = excluded.correo;

update public.perfiles p
  set rol = 'propietario'
  from auth.users u
  where u.id = p.id and lower(u.email) = 'admin@gmail.com';

-- 4. Funciones de consulta del rol.
create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.rol from public.perfiles p
  where p.id = auth.uid() and p.activo;
$$;

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.rol_actual() = 'propietario', false);
$$;

create or replace function public.es_personal()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.rol_actual() in ('propietario', 'empleado'), false);
$$;

revoke all on function public.rol_actual() from public, anon;
revoke all on function public.es_administrador() from public, anon;
revoke all on function public.es_personal() from public, anon;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.es_administrador() to authenticated;
grant execute on function public.es_personal() to authenticated;

-- 5. Reglas de modificación de perfiles.
-- * actualizado_en se mantiene solo.
-- * Un Propietario no puede quitarse su propio rol ni desactivarse (evita dejar
--   el sistema sin administrador por error).
create or replace function public.perfiles_antes_de_actualizar()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.id = auth.uid() and old.rol = 'propietario'
    and (new.rol <> 'propietario' or not new.activo) then
    raise exception using errcode = '42501',
      message = 'No puedes quitarte el rol de Propietario ni desactivar tu propia cuenta';
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

revoke all on function public.perfiles_antes_de_actualizar() from public, anon, authenticated;

drop trigger if exists perfiles_antes_de_actualizar on public.perfiles;
create trigger perfiles_antes_de_actualizar
  before update on public.perfiles
  for each row
  execute function public.perfiles_antes_de_actualizar();

-- 6. RLS: cada usuario lee su perfil; el Propietario lee y modifica todos.
-- Los perfiles solo se crean con el trigger y no se borran desde la app.
-- Solo se pueden modificar rol, activo, nombre y celular: id, correo y fechas
-- los mantiene la base de datos.
alter table public.perfiles enable row level security;
revoke all on table public.perfiles from public, anon, authenticated;
grant select on table public.perfiles to authenticated;
grant update (rol, activo, nombre, celular) on table public.perfiles to authenticated;

drop policy if exists perfiles_leer_propio_o_propietario on public.perfiles;
create policy perfiles_leer_propio_o_propietario
  on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_administrador());

drop policy if exists perfiles_actualizar_propietario on public.perfiles;
create policy perfiles_actualizar_propietario
  on public.perfiles for update to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());
