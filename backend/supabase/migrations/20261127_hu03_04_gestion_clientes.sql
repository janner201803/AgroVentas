begin;

alter table public.clientes
  add column if not exists activo boolean not null default true;

create index if not exists clientes_activo_nombre_idx
  on public.clientes (activo, lower(nombre));

-- Una ficha desactivada conserva su historial, pero no habilita nuevas ventas
-- a crédito. Las ventas no crediticias siguen quedando vinculadas a la ficha.
create or replace function public.registrar_venta_entregada() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  metodo text := current_setting('agroventas.pago_entrega', true);
  cliente bigint;
  ficha_activa boolean;
begin
  if not public.es_personal() then raise insufficient_privilege; end if;
  if metodo is null or metodo not in ('efectivo', 'transferencia', 'credito') then
    raise exception using errcode = '22023', message = 'Confirma el método de pago antes de entregar';
  end if;

  select id, activo into cliente, ficha_activa
    from public.clientes
    where cuenta_id::text = new.id_usuario::text;

  if metodo = 'credito' and (cliente is null or not ficha_activa) then
    raise exception using errcode = '22023',
      message = 'El crédito requiere una ficha comercial activa vinculada al cliente';
  end if;

  insert into public.ventas(pedido_id, cliente_id, metodo_pago, total, lineas, registrado_por)
    values(new.id, cliente, metodo, new.valor, coalesce(new.lineas, jsonb_build_array(jsonb_build_object(
      'id_producto', new.id_producto, 'cantidad', new.cantidad, 'subtotal', new.valor))), auth.uid());
  return new;
end;
$$;

create or replace function public.pedidos_personal(p_desde date default null, p_hasta date default null)
returns setof jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select p || jsonb_build_object('credito_habilitado', exists (
    select 1 from public.clientes c where c.cuenta_id::text = p->>'id_usuario' and c.activo))
  || case when v.id is null then '{}'::jsonb else jsonb_build_object('metodo_pago', v.metodo_pago) end
  from public.pedidos_personal_base(p_desde, p_hasta) p
  left join public.ventas v on v.pedido_id = p->>'id';
$$;

create or replace function public.clientes_personal(
  p_busqueda text default null,
  p_incluir_inactivos boolean default false
) returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  busqueda text := nullif(trim(coalesce(p_busqueda, '')), '');
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el personal puede consultar fichas comerciales';
  end if;
  if length(coalesce(p_busqueda, '')) > 120 then
    raise exception using errcode = '22023', message = 'La búsqueda no puede superar 120 caracteres';
  end if;

  return query
  select to_jsonb(c) || jsonb_build_object(
    'correo_cuenta', p.correo,
    'nombre_cuenta', p.nombre,
    'ventas_cantidad', (select count(*) from public.ventas v where v.cliente_id = c.id),
    'ventas_total', coalesce((select sum(v.total) from public.ventas v where v.cliente_id = c.id), 0),
    'saldo_pendiente_total', coalesce((
      select sum(cpc.saldo_pendiente)
      from public.cuentas_por_cobrar cpc
      where cpc.cliente_id = c.id and cpc.estado <> 'pagada'
    ), 0),
    'ultima_compra', (select max(v.creado_en) from public.ventas v where v.cliente_id = c.id)
  )
  from public.clientes c
  left join public.perfiles p on p.id = c.cuenta_id
  where (p_incluir_inactivos or c.activo)
    and (busqueda is null or concat_ws(' ', c.nombre, c.telefono, c.direccion, p.correo)
      ilike '%' || busqueda || '%')
  order by c.activo desc, lower(c.nombre), c.id
  limit 250;
end;
$$;

create or replace function public.cliente_comercial_detalle(p_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  resultado jsonb;
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el personal puede consultar fichas comerciales';
  end if;
  if p_id is null or p_id <= 0 then
    raise exception using errcode = '22023', message = 'El cliente indicado no es válido';
  end if;

  select to_jsonb(c) || jsonb_build_object(
    'correo_cuenta', per.correo,
    'nombre_cuenta', per.nombre,
    'ventas', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'pedido_id', v.pedido_id,
          'total', v.total,
          'metodo_pago', v.metodo_pago,
          'creado_en', v.creado_en,
          'lineas', v.lineas,
          'fecha_entrega', ped.fecha_entrega,
          'hora_entrega', ped.hora_entrega,
          'estado_pedido', ped.estado,
          'saldo_pendiente', cpc.saldo_pendiente,
          'estado_cuenta', cpc.estado,
          'abonos', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', a.id,
              'valor', a.valor,
              'metodo_pago', a.metodo_pago,
              'nota', a.nota,
              'registrado_en', a.registrado_en
            ) order by a.registrado_en desc, a.id desc)
            from public.abonos_cuenta a
            where a.cuenta_id = cpc.id
          ), '[]'::jsonb)
        ) order by v.creado_en desc, v.id desc
      )
      from public.ventas v
      left join public.pedidos ped on ped.id = v.pedido_id
      left join public.cuentas_por_cobrar cpc on cpc.venta_id = v.id
      where v.cliente_id = c.id
    ), '[]'::jsonb)
  ) into resultado
  from public.clientes c
  left join public.perfiles per on per.id = c.cuenta_id
  where c.id = p_id;

  return resultado;
end;
$$;

create or replace function public.actualizar_cliente_comercial(
  p_id bigint,
  p_nombre text,
  p_telefono text,
  p_direccion text,
  p_observaciones text,
  p_activo boolean default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  resultado jsonb;
begin
  if not public.es_personal() then
    raise exception using errcode = '42501', message = 'Solo el personal puede actualizar fichas comerciales';
  end if;
  if p_id is null or p_id <= 0 then
    raise exception using errcode = '22023', message = 'El cliente indicado no es válido';
  end if;

  update public.clientes c
  set nombre = trim(p_nombre),
      telefono = trim(p_telefono),
      direccion = trim(p_direccion),
      observaciones = nullif(trim(coalesce(p_observaciones, '')), ''),
      activo = coalesce(p_activo, c.activo)
  where c.id = p_id
  returning to_jsonb(c) into resultado;

  if resultado is null then
    raise exception using errcode = 'P0002', message = 'La ficha comercial no existe';
  end if;
  return resultado;
end;
$$;

revoke all on function public.clientes_personal(text, boolean), public.cliente_comercial_detalle(bigint),
  public.actualizar_cliente_comercial(bigint, text, text, text, text, boolean) from public, anon;
grant execute on function public.clientes_personal(text, boolean), public.cliente_comercial_detalle(bigint),
  public.actualizar_cliente_comercial(bigint, text, text, text, text, boolean) to authenticated;

commit;
