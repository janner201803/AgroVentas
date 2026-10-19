const supabase = require('../database/supabase');

class PedidoRepository {
  async crear(pedido) {
    const { data, error } = await supabase
      .from('pedidos')
      .insert(pedido)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async listarPorUsuario(idUsuario) {
    const { data, error } = await supabase
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