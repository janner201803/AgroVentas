begin;
create view public.ventas_detalle with (security_barrier = true) as
select v.id, v.pedido_id, v.total, v.metodo_pago, v.creado_en, v.lineas,
       coalesce(nullif(trim(c.nombre), ''), nullif(trim(perfil.nombre), '')) as cliente_nombre
from public.ventas v
join public.pedidos p on p.id = v.pedido_id
left join public.clientes c on c.id = v.cliente_id
left join public.perfiles perfil on perfil.id::text = p.id_usuario::text
where public.es_personal();
revoke all on public.ventas_detalle from public, anon, authenticated;
grant select on public.ventas_detalle to authenticated;
commit;
