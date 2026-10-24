const inventarioService = require('../../application/services/InventarioService');

class InventarioController {
  async listar(req, res) {
    const inicioConsulta = performance.now();
    try {
      const productos = req.query.disponibles === 'true'
        ? await inventarioService.listarDisponibles(req.supabase)
        : await inventarioService.listar(req.supabase);
      const consultaMs = performance.now() - inicioConsulta;
      const authMs = req.validacionTokenMs || 0;
      res.setHeader('Server-Timing', `auth;dur=${authMs.toFixed(1)}, inventario;dur=${consultaMs.toFixed(1)}, api;dur=${(performance.now() - req.inicioSolicitudMs).toFixed(1)}`);
      return res.status(200).json(productos);
    } catch (error) {
      console.error('[InventarioController.listar] Error consultando Supabase:', {
        codigo: error.code,
        error: error.message
      });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar el inventario' });
    }
  }

  async crear(req, res) {
    const inicio = performance.now();
    console.info('[InventarioController.crear] Solicitud recibida');
    try {
      const producto = await inventarioService.crear(req.body, req.supabase);
      console.info('[InventarioController.crear] Producto guardado', {
        duracionMs: Math.round(performance.now() - inicio)
      });
      return res.status(201).json({ mensaje: 'Producto agregado al inventario', producto });
    } catch (error) {
      console.error('[InventarioController.crear] Falló la inserción:', {
        duracionMs: Math.round(performance.now() - inicio),
        codigo: error.code,
        error: error.message
      });
      return res.status(error.status || 500).json({ mensaje: error.message });
    }
  }

}

module.exports = new InventarioController();
