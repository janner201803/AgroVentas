const pedidoRepository = require(
  '../../infraestructure/repositories/PedidoRepository'
);

class PedidoService {
  async crear(datos, idUsuario) {
    const {
      id,
      valor,
      cantidad,
      fecha_entrega,
      metodo_pago,
      estado,
      id_producto
    } = datos;

    if (
      !id ||
      valor == null ||
      cantidad == null ||
      !fecha_entrega ||
      !metodo_pago ||
      !id_producto
    ) {
      throw new Error('Faltan datos obligatorios del pedido');
    }

    const pedido = {
      id,
      valor,
      cantidad,
      fecha_entrega,
      metodo_pago,
      estado: estado || 'pendiente',
      id_producto,
      id_usuario: idUsuario
    };

    return await pedidoRepository.crear(pedido);
  }

  async listarPorUsuario(idUsuario) {
    return await pedidoRepository.listarPorUsuario(idUsuario);
  }
}

module.exports = new PedidoService();