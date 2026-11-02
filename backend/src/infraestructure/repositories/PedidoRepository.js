const supabase = require('../database/supabase');

function errorSupabase(error, accion) {
  const fallo = new Error(error.message || `No fue posible ${accion}`);
  fallo.code = error.code;
  fallo.details = error.details;
  fallo.hint = error.hint;
  fallo.status = error.code === '42501' ? 403
    : error.code === '23505' ? 409
      : ['23502', '23503', '23514', '22P02', '22023'].includes(error.code) ? 400
        : 500;
  return fallo;
}

class PedidoRepository {
  async horariosOcupados(fecha, client = supabase) {
    const { data, error } = await client.rpc('horarios_ocupados', { p_fecha: fecha });
    if (error) {
      if (['PGRST202', '42883', '42501'].includes(error.code)) {
        const setupError = new Error('Falta habilitar la consulta de horarios en Supabase. Ejecuta la migración indicada en backend/supabase/SETUP.md.');
        setupError.status = 503;
        throw setupError;
      }
      throw errorSupabase(error, 'consultar los horarios');
    }
    return data.map(pedido => String(pedido.hora_entrega).slice(0, 5));
  }

  async horarioOcupado(fecha, hora, client = supabase) {
    const ocupados = await this.horariosOcupados(fecha, client);
    return ocupados.includes(hora);
  }

  async crear(pedido, client = supabase) {
    const { data, error } = await client
      .from('pedidos')
      .insert(pedido)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const conflict = errorSupabase(error, 'crear el pedido');
        conflict.message = 'Ese horario acaba de ser ocupado. Selecciona otro.';
        throw conflict;
      }
      throw errorSupabase(error, 'crear el pedido');
    }

    return data;
  }

  async listarPorUsuario(idUsuario, client = supabase) {
    const { data, error } = await client
      .from('pedidos')
      .select('*')
      .eq('id_usuario', idUsuario);

    if (error) {
      throw errorSupabase(error, 'consultar los pedidos');
    }

    return data;
  }
}

module.exports = new PedidoRepository();
