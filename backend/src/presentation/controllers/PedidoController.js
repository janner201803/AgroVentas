const pedidoService = require(
  '../../application/services/PedidoService'
);

class PedidoController {
  async crear(req, res) {
    try {
      const idUsuario = req.user.id;

      const pedido = await pedidoService.crear(
        req.body,
        idUsuario,
        req.supabase
      );

      return res.status(201).json({
        mensaje: 'Pedido creado correctamente',
        pedido
      });
    } catch (error) {
      return res.status(error.status || 400).json({
        mensaje: error.message
      });
    }
  }

  async horarios(req, res) {
    try {
      const horarios = await pedidoService.horariosDisponibles(req.query.fecha, req.supabase);
      return res.status(200).json(horarios);
    } catch (error) {
      return res.status(error.status || 400).json({ mensaje: error.message });
    }
  }

  async listar(req, res) {
    try {
      const idUsuario = req.user.id;

      const pedidos = await pedidoService.listarPorUsuario(
        idUsuario,
        req.supabase
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
