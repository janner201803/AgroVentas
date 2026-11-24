begin;

create table if not exists public.abonos_cuenta (
  id bigint generated always as identity primary key,
  cuenta_id bigint not null
    references public.cuentas_por_cobrar(id) on update cascade on delete restrict,
  valor numeric not null check (valor > 0),
  metodo_pago text not null check (metodo_pago in ('efectivo', 'transferencia')),
  nota text,
  registrado_por uuid not null references auth.users(id),
  registrado_en timestamptz not null default now()
);

create index if not exists abonos_cuenta_cuenta_fecha_idx
  on public.abonos_cuenta (cuenta_id, registrado_en desc, id desc);

alter table public.abonos_cuenta enable row level security;
revoke all on public.abonos_cuenta from public, anon, authenticated;

create or replace function public.cartera_personal(p_estado text default null)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el personal puede consultar la cartera';
  end if;
  if p_estado is not null and p_estado not in ('pendiente', 'parcial', 'pagada') then
    raise exception using errcode = '22023', message = 'El filtro de estado no es válido';
  end if;

  return query
  select to_jsonb(cpc) || jsonb_build_object(
    'cliente_nombre', cl.nombre,
    'cliente_telefono', cl.telefono,
    'pedido_id', v.pedido_id,
    'lineas', v.lineas,
    'dias_mora', case
      when cpc.fecha_vencimiento is null then null
      else greatest(current_date - cpc.fecha_vencimiento, 0)
    end,
    'abonos', coalesce((
      select jsonb_agg(
        to_jsonb(a) || jsonb_build_object('registrado_por_nombre', coalesce(per.nombre, per.correo))
        order by a.registrado_en desc, a.id desc
      )
      from public.abonos_cuenta a
      left join public.perfiles per on per.id = a.registrado_por
      where a.cuenta_id = cpc.id
    ), '[]'::jsonb)
  )
  from public.cuentas_por_cobrar cpc
  join public.clientes cl on cl.id = cpc.cliente_id
  join public.ventas v on v.id = cpc.venta_id
  where p_estado is null or cpc.estado = p_estado
  order by (cpc.estado = 'pagada'), cpc.fecha_vencimiento nulls last, cpc.fecha_emision desc, cpc.id desc;
end;
$$;

create or replace function public.registrar_abono_cuenta(
  p_cuenta_id bigint,
  p_valor numeric,
  p_metodo_pago text,
  p_nota text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cuenta public.cuentas_por_cobrar%rowtype;
  abono public.abonos_cuenta%rowtype;
  nuevo_saldo numeric;
  nuevo_estado text;
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el personal puede registrar abonos';
  end if;
  if p_cuenta_id is null or p_cuenta_id <= 0 then
    raise exception using errcode = '22023', message = 'La cuenta indicada no es válida';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception using errcode = '22023', message = 'El valor del abono debe ser mayor que cero';
  end if;
  if p_metodo_pago not in ('efectivo', 'transferencia') then
    raise exception using errcode = '22023', message = 'Selecciona efectivo o transferencia';
  end if;
  if length(coalesce(p_nota, '')) > 500 then
    raise exception using errcode = '22023', message = 'La nota no puede superar 500 caracteres';
  end if;

  select * into cuenta
  from public.cuentas_por_cobrar
  where id = p_cuenta_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'La cuenta por cobrar no existe';
  end if;
  if cuenta.estado = 'pagada' then
    raise exception using errcode = '22023', message = 'Esta cuenta ya está pagada';
  end if;
  if p_valor > cuenta.saldo_pendiente then
    raise exception using errcode = '22023', message = 'El abono no puede superar el saldo pendiente';
  end if;

  insert into public.abonos_cuenta (cuenta_id, valor, metodo_pago, nota, registrado_por)
  values (cuenta.id, p_valor, p_metodo_pago, nullif(trim(p_nota), ''), auth.uid())
  returning * into abono;

  nuevo_saldo := cuenta.saldo_pendiente - p_valor;
  nuevo_estado := case when nuevo_saldo = 0 then 'pagada' else 'parcial' end;

  update public.cuentas_por_cobrar
    set saldo_pendiente = nuevo_saldo, estado = nuevo_estado
    where id = cuenta.id;

  return jsonb_build_object(
    'cuenta_id', cuenta.id,
    'saldo_pendiente', nuevo_saldo,
    'estado', nuevo_estado,
    'abono', to_jsonb(abono)
  );
end;
$$;

revoke all on function public.cartera_personal(text) from public, anon;
revoke all on function public.registrar_abono_cuenta(bigint, numeric, text, text) from public, anon;
grant execute on function public.cartera_personal(text), public.registrar_abono_cuenta(bigint, numeric, text, text) to authenticated;

commit;
