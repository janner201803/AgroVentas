const carteraService = require('../../application/services/CarteraService');

class CarteraController {
  async listar(req, res) {
    try {
      return res.status(200).json(await carteraService.listar(req.query.estado, req.supabase));
    } catch (error) {
      console.error('[CarteraController.listar] Falló la consulta:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar la cartera' });
    }
  }

  async listarMisCompras(req, res) {
    try {
      return res.status(200).json(await carteraService.listarMisCompras(req.supabase));
    } catch (error) {
      console.error('[CarteraController.listarMisCompras] Falló la consulta:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar tus compras' });
    }
  }

  async registrarAbono(req, res) {
    try {
      const abono = await carteraService.registrarAbono(req.params.id, req.body, req.supabase);
      return res.status(201).json({ mensaje: 'Abono registrado y saldo actualizado', abono });
    } catch (error) {
      console.error('[CarteraController.registrarAbono] Falló el registro:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible registrar el abono' });
    }
  }
}

module.exports = new CarteraController();
