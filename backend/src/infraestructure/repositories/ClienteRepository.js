const supabase = require('../database/supabase');

function errorSupabase(error, accion) {
  const noInstalada = ['PGRST202', '42883'].includes(error.code);
  const fallo = new Error(noInstalada
    ? 'Falta instalar la migración 20261127_hu03_04_gestion_clientes.sql en Supabase.'
    : error.message || `No fue posible ${accion}`);
  fallo.code = error.code;
  fallo.status = noInstalada ? 503
    : error.code === '42501' ? 403
      : error.code === 'P0002' ? 404
        : ['23505', '23514', '22023', '22P02'].includes(error.code) ? 400
          : 500;
  throw fallo;
}

class ClienteRepository {
  async registrar(datos, client = supabase) {
    const { data, error } = await client.rpc('registrar_cliente_comercial', {
      p_nombre: datos.nombre,
      p_telefono: datos.telefono,
      p_direccion: datos.direccion,
      p_observaciones: datos.observaciones,
      p_correo: datos.correo
    });
    if (error) errorSupabase(error, 'registrar el cliente');
    return data;
  }

  async listar(busqueda, incluirInactivos, client = supabase) {
    const { data, error } = await client.rpc('clientes_personal', {
      p_busqueda: busqueda || null,
      p_incluir_inactivos: incluirInactivos
    });
    if (error) errorSupabase(error, 'consultar las fichas comerciales');
    return data ?? [];
  }

  async detalle(id, client = supabase) {
    const { data, error } = await client.rpc('cliente_comercial_detalle', { p_id: id });
    if (error) errorSupabase(error, 'consultar el detalle del cliente');
    return data;
  }

  async actualizar(id, datos, client = supabase) {
    const { data, error } = await client.rpc('actualizar_cliente_comercial', {
      p_id: id,
      p_nombre: datos.nombre,
      p_telefono: datos.telefono,
      p_direccion: datos.direccion,
      p_observaciones: datos.observaciones,
      p_activo: datos.activo ?? null
    });
    if (error) errorSupabase(error, 'actualizar la ficha comercial');
    return data;
  }
}

module.exports = new ClienteRepository();
