-- El catalogo guarda nombre/unidad/precio; inventario guarda existencias.
-- Ejecutar en Supabase SQL Editor.

-- Columna de relacion mostrada en el esquema nuevo.
alter table public.inventario
  add column if not exists id_producto bigint;

-- Los movimientos anteriores del mismo producto se consolidan en una fila.
do $$
declare
  producto_repetido record;
  fila_conservada bigint;
  cantidad_total double precision;
begin
  if exists (select 1 from public.inventario where id_producto is null) then
    raise exception 'Hay filas de inventario sin id_producto. Asigna cada fila a public.productos antes de ejecutar esta migracion.';
  end if;

  for producto_repetido in
    select id_producto
    from public.inventario
    group by id_producto
    having count(*) > 1
  loop
    select sum(cantidad)::double precision
      into cantidad_total
      from public.inventario
      where id_producto = producto_repetido.id_producto;

    select id into fila_conservada
      from public.inventario
      where id_producto = producto_repetido.id_producto
      order by id asc
      limit 1;

    update public.inventario
      set cantidad = cantidad_total
      where id = fila_conservada;

    delete from public.inventario
      where id_producto = producto_repetido.id_producto
        and id <> fila_conservada;
  end loop;
end;
$$;

alter table public.inventario alter column id_producto set not null;
create unique index if not exists inventario_id_producto_uidx
  on public.inventario (id_producto);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventario_id_producto_fkey'
      and conrelid = 'public.inventario'::regclass
  ) then
    alter table public.inventario
      add constraint inventario_id_producto_fkey
      foreign key (id_producto) references public.productos(id)
      on delete restrict;
  end if;
end;
$$;

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

alter table public.productos enable row level security;
grant select, insert, update, delete on public.productos to authenticated;

-- Reemplaza unicamente las reglas anteriores de productos.
do $$
declare
  politica record;
begin
  for politica in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = 'productos'
  loop
    execute format('drop policy if exists %I on public.%I', politica.policyname, politica.tablename);
  end loop;
end;
$$;

create policy productos_leer_autenticados
  on public.productos for select to authenticated using (true);
create policy productos_insertar_admin
  on public.productos for insert to authenticated with check (public.es_administrador());
create policy productos_actualizar_admin
  on public.productos for update to authenticated
  using (public.es_administrador()) with check (public.es_administrador());
create policy productos_eliminar_admin
  on public.productos for delete to authenticated using (public.es_administrador());

do $$
declare secuencia text;
begin
  secuencia := pg_get_serial_sequence('public.productos', 'id');
  if secuencia is not null then
    execute format('grant usage, select on sequence %s to authenticated', secuencia);
  end if;
end;
$$;

-- Operacion atomica: crea la fila la primera vez y suma la cantidad en
-- llamadas posteriores para el mismo id_producto.
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
  if not public.es_administrador() then
    raise exception using errcode = '42501', message = 'Solo admin@gmail.com puede modificar el inventario';
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
