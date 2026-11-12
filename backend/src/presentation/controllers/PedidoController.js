const pedidoService = require(
  '../../application/services/PedidoService'
);

class PedidoController {
  async crear(req, res) {
    try {
      const pedido = await pedidoService.crear(
        req.body,
        req.supabase
      );

      return res.status(201).json({
        mensaje: 'Pedido creado correctamente',
        pedido
      });
    } catch (error) {
      console.error('[PedidoController.crear] Falló la creación del pedido:', {
        status: error.status || 500,
        codigo: error.code || null,
        error: error.message,
        detalle: error.details || null,
        sugerencia: error.hint || null
      });
      return res.status(error.status || (error.code ? 500 : 400)).json({
        mensaje: error.message || 'No fue posible registrar el pedido',
        codigo: error.code || undefined
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
      // HU-08: se conserva el estado real (403, 504...) y se registra el detalle
      // en el servidor para poder diagnosticar, sin exponerlo al cliente si es un 500.
      const status = error.status || 500;
      console.error('[PedidoController.listar] Falló la consulta del historial:', {
        status,
        codigo: error.code || null,
        error: error.message,
        detalle: error.details || null
      });
      return res.status(status).json({
        mensaje: status === 500
          ? 'No fue posible consultar tus pedidos. Intenta de nuevo en un momento.'
          : error.message,
        codigo: error.code || undefined
      });
    }
  }
}

module.exports = new PedidoController();
