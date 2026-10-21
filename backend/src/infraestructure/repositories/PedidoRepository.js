const supabase = require('../database/supabase');

class PedidoRepository {
  async horariosOcupados(fecha, client = supabase) {
    const { data, error } = await client.rpc('horarios_ocupados', { p_fecha: fecha });
    if (error) {
      if (['PGRST202', '42883', '42501'].includes(error.code)) {
        const setupError = new Error('Falta habilitar la consulta de horarios en Supabase. Ejecuta la migración indicada en backend/supabase/SETUP.md.');
        setupError.status = 503;
        throw setupError;
      }
      throw new Error(error.message);
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

    if (error?.code === '23505') {
      const conflict = new Error('Ese horario acaba de ser ocupado. Selecciona otro.');
      conflict.status = 409;
      throw conflict;
    }
    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async listarPorUsuario(idUsuario, client = supabase) {
    const { data, error } = await client
      .from('pedidos')
      .select('*')
      .eq('id_usuario', idUsuario);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

module.exports = new PedidoRepository();
