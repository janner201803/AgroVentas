begin;

-- Una cuenta por cobrar por cada venta a crédito. Los abonos y el vencimiento
-- se incorporarán en las siguientes partes de HU-15/HU-16.
create table if not exists public.cuentas_por_cobrar (
  id bigint generated always as identity primary key,
  venta_id bigint not null unique
    references public.ventas(id) on update cascade on delete restrict,
  cliente_id bigint not null
    references public.clientes(id) on update cascade on delete restrict,
  valor_original numeric not null check (valor_original > 0),
  fecha_emision timestamptz not null,
  fecha_vencimiento date,
  saldo_pendiente numeric not null check (
    saldo_pendiente >= 0 and saldo_pendiente <= valor_original
  ),
  estado text not null check (estado in ('pendiente', 'parcial', 'pagada')),
  creado_en timestamptz not null default now(),
  check (
    (estado = 'pendiente' and saldo_pendiente = valor_original) or
    (estado = 'parcial' and saldo_pendiente > 0 and saldo_pendiente < valor_original) or
    (estado = 'pagada' and saldo_pendiente = 0)
  )
);

create index if not exists cuentas_por_cobrar_cliente_estado_idx
  on public.cuentas_por_cobrar (cliente_id, estado);
create index if not exists cuentas_por_cobrar_fecha_emision_idx
  on public.cuentas_por_cobrar (fecha_emision desc);

alter table public.cuentas_por_cobrar enable row level security;
revoke all on public.cuentas_por_cobrar from public, anon, authenticated;

create or replace function public.generar_cuenta_por_cobrar_venta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.metodo_pago = 'credito' then
    if new.cliente_id is null then
      raise exception using
        errcode = '23514',
        message = 'Una venta a crédito debe estar vinculada a un cliente';
    end if;

    insert into public.cuentas_por_cobrar (
      venta_id, cliente_id, valor_original, fecha_emision, saldo_pendiente, estado
    ) values (
      new.id, new.cliente_id, new.total, new.creado_en, new.total, 'pendiente'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.generar_cuenta_por_cobrar_venta() from public, anon, authenticated;

drop trigger if exists generar_cuenta_por_cobrar_despues_venta on public.ventas;
create trigger generar_cuenta_por_cobrar_despues_venta
  after insert on public.ventas
  for each row
  execute function public.generar_cuenta_por_cobrar_venta();

-- Incluye ventas a crédito registradas antes de instalar esta migración.
insert into public.cuentas_por_cobrar (
  venta_id, cliente_id, valor_original, fecha_emision, saldo_pendiente, estado
)
select v.id, v.cliente_id, v.total, v.creado_en, v.total, 'pendiente'
from public.ventas v
where v.metodo_pago = 'credito'
  and v.cliente_id is not null
on conflict (venta_id) do nothing;

commit;
