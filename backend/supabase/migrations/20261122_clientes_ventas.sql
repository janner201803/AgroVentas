begin;

create table public.clientes (
  id bigint generated always as identity primary key,
  nombre text not null check (trim(nombre) <> ''),
  telefono text not null unique check (telefono ~ '^[0-9]{10}$'),
  direccion text not null check (trim(direccion) <> ''),
  observaciones text,
  cuenta_id uuid unique references auth.users(id),
  registrado_por uuid not null references auth.users(id),
  creado_en timestamptz not null default now()
);
alter table public.clientes enable row level security;
revoke all on public.clientes from public, anon, authenticated;

create function public.registrar_cliente_comercial(p_nombre text, p_telefono text, p_direccion text,
  p_observaciones text, p_correo text) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cuenta uuid;
  nuevo bigint;
begin
  if not public.es_personal() then raise insufficient_privilege; end if;
  if nullif(trim(p_correo),'') is not null then
    select id into strict cuenta from public.perfiles
      where lower(correo) = lower(trim(p_correo)) and rol = 'cliente';
  end if;
  insert into public.clientes(nombre, telefono, direccion, observaciones, cuenta_id, registrado_por)
    values(trim(p_nombre), trim(p_telefono), trim(p_direccion), nullif(trim(p_observaciones),''), cuenta, auth.uid())
    returning id into nuevo;
  return nuevo;
exception when no_data_found then raise exception 'No se encontró una cuenta de cliente con ese correo';
when unique_violation then raise exception 'El teléfono o la cuenta ya tiene ficha comercial';
end;
$$;

create table public.ventas (
  id bigint generated always as identity primary key,
  pedido_id varchar not null unique references public.pedidos(id),
  cliente_id bigint references public.clientes(id),
  metodo_pago text not null check (metodo_pago in ('efectivo','transferencia','credito')),
  check (metodo_pago <> 'credito' or cliente_id is not null),
  total numeric not null,
  lineas jsonb not null,
  registrado_por uuid not null references auth.users(id),
  creado_en timestamptz not null default now()
);
alter table public.ventas enable row level security;
revoke all on public.ventas from public, anon, authenticated;

create function public.registrar_venta_entregada() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  metodo text := current_setting('agroventas.pago_entrega',true);
  cliente bigint;
begin
  if not public.es_personal() then raise insufficient_privilege; end if;
  if metodo is null or metodo not in ('efectivo','transferencia','credito') then
    raise exception using errcode='22023', message='Confirma el método de pago antes de entregar';
  end if;
  select id into cliente from public.clientes where cuenta_id::text = new.id_usuario::text;
  if metodo='credito' and cliente is null then
    raise exception using errcode='22023', message='El crédito requiere una ficha comercial registrada por el personal';
  end if;
  insert into public.ventas(pedido_id,cliente_id,metodo_pago,total,lineas,registrado_por)
    values(new.id,cliente,metodo,new.valor,coalesce(new.lineas,jsonb_build_array(jsonb_build_object(
      'id_producto',new.id_producto,'cantidad',new.cantidad,'subtotal',new.valor))),auth.uid());
  return new;
end;
$$;
create trigger venta_al_entregar after update of estado on public.pedidos
for each row when (new.estado='entregado' and new.estado is distinct from old.estado)
execute function public.registrar_venta_entregada();

create function public.entregar_pedido(p_id_pedido varchar,p_pago text,p_nota text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  perform set_config('agroventas.pago_entrega',coalesce(p_pago,''),true);
  return public.cambiar_estado_pedido(p_id_pedido,'entregado',p_nota) || jsonb_build_object('metodo_pago',p_pago);
end;
$$;

alter function public.pedidos_personal(date,date) rename to pedidos_personal_base;
create function public.pedidos_personal(p_desde date default null,p_hasta date default null)
returns setof jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select p || jsonb_build_object('credito_habilitado',exists (
    select 1 from public.clientes c where c.cuenta_id::text=p->>'id_usuario'))
  || case when v.id is null then '{}'::jsonb else jsonb_build_object('metodo_pago',v.metodo_pago) end
  from public.pedidos_personal_base(p_desde,p_hasta) p
  left join public.ventas v on v.pedido_id=p->>'id';
$$;
revoke all on function public.registrar_cliente_comercial(text,text,text,text,text), public.entregar_pedido(varchar,text,text), public.pedidos_personal(date,date), public.registrar_venta_entregada() from public, anon, authenticated;
grant execute on function public.registrar_cliente_comercial(text,text,text,text,text), public.entregar_pedido(varchar,text,text), public.pedidos_personal(date,date) to authenticated;
commit;


