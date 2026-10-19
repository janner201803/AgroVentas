const pedidoService = require(
  '../../application/services/PedidoService'
);

class PedidoController {
  async crear(req, res) {
    try {
      // Por ahora, este valor debe proceder
      // de una autenticación validada.
      const idUsuario = req.user.id;

      const pedido = await pedidoService.crear(
        req.body,
        idUsuario
      );

      return res.status(201).json({
        mensaje: 'Pedido creado correctamente',
        pedido
      });
    } catch (error) {
      return res.status(400).json({
        mensaje: error.message
      });
    }
  }

  async listar(req, res) {
    try {
      const idUsuario = req.user.id;

      const pedidos = await pedidoService.listarPorUsuario(
        idUsuario
      );

      return res.status(200).json(pedidos);
    } catch (error) {
      return res.status(500).json({
        mensaje: 'Error al consultar los pedidos'
      });
    }
  }
}

module.exports = new PedidoController();