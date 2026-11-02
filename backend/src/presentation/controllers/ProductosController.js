const productosService = require('../../application/services/ProductosService');

class ProductosController {
  async listar(req, res) {
    try {
      return res.status(200).json(await productosService.listar(req.supabase));
    } catch (error) {
      console.error('[ProductosController.listar] Falló la consulta del catálogo:', error.message);
      return res.status(error.status || 500).json({ mensaje: error.message });
    }
  }
}

module.exports = new ProductosController();
