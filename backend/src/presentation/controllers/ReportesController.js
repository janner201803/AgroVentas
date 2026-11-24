const reportesService = require('../../application/services/ReportesService');

class ReportesController {
  async resumen(req, res) {
    try {
      return res.status(200).json(await reportesService.resumen(req.query.desde, req.query.hasta, req.supabase));
    } catch (error) {
      console.error('[ReportesController.resumen] Falló la consulta:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar el tablero' });
    }
  }
}

module.exports = new ReportesController();
