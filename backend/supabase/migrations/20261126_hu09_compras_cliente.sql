begin;

-- Consulta únicamente las ventas asociadas a pedidos del usuario autenticado.
-- La cuenta por cobrar y sus abonos se obtienen por la venta, nunca por un id
-- enviado por el navegador.
create or replace function public.mis_compras_cliente()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.rol_actual() is distinct from 'cliente' then
    raise exception using errcode = '42501', message = 'Solo un cliente puede consultar sus propias compras';
  end if;

  return query
  select to_jsonb(v) || jsonb_build_object(
    'fecha_entrega', p.fecha_entrega,
    'hora_entrega', p.hora_entrega,
    'estado_pedido', p.estado,
    'cuenta', case when cpc.id is null then null else
      jsonb_build_object(
        'id', cpc.id,
        'valor_original', cpc.valor_original,
        'saldo_pendiente', cpc.saldo_pendiente,
        'estado', cpc.estado,
        'fecha_emision', cpc.fecha_emision,
        'fecha_vencimiento', cpc.fecha_vencimiento,
        'dias_mora', case
          when cpc.fecha_vencimiento is null then null
          else greatest(current_date - cpc.fecha_vencimiento, 0)
        end
      )
    end,
    'abonos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'valor', a.valor,
          'metodo_pago', a.metodo_pago,
          'nota', a.nota,
          'registrado_en', a.registrado_en
        ) order by a.registrado_en desc, a.id desc
      )
      from public.abonos_cuenta a
      where a.cuenta_id = cpc.id
    ), '[]'::jsonb)
  )
  from public.ventas v
  join public.pedidos p on p.id = v.pedido_id
  left join public.cuentas_por_cobrar cpc on cpc.venta_id = v.id
  where p.id_usuario = auth.uid()
  order by v.creado_en desc, v.id desc;
end;
$$;

revoke all on function public.mis_compras_cliente() from public, anon;
grant execute on function public.mis_compras_cliente() to authenticated;

commit;
