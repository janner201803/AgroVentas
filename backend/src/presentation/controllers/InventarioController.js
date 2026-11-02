const inventarioService = require('../../application/services/InventarioService');

class InventarioController {
  async listar(req, res) {
    const inicio = performance.now();
    try {
      const filas = req.query.disponibles === 'true'
        ? await inventarioService.listarDisponibles(req.supabase)
        : await inventarioService.listar(req.supabase);
      const duracion = performance.now() - inicio;
      res.setHeader('Server-Timing', `auth;dur=${(req.validacionTokenMs || 0).toFixed(1)}, inventario;dur=${duracion.toFixed(1)}`);
      return res.status(200).json(filas);
    } catch (error) {
      console.error('[InventarioController.listar] Error consultando Supabase:', error.message);
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar el inventario' });
    }
  }

  async agregarExistencias(req, res) {
    const inicio = performance.now();
    try {
      const producto = await inventarioService.agregarExistencias(req.body, req.supabase);
      const status = producto.creado ? 201 : 200;
      return res.status(status).json({
        mensaje: producto.creado
          ? `Se agregaron existencias de ${producto.nombre} al inventario`
          : `Se sumaron las existencias de ${producto.nombre}`,
        producto,
        duracionMs: Math.round(performance.now() - inicio)
      });
    } catch (error) {
      console.error('[InventarioController.agregarExistencias] Falló el guardado:', {
        duracionMs: Math.round(performance.now() - inicio),
        codigo: error.code,
        error: error.message
      });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible agregar existencias' });
    }
  }
}

module.exports = new InventarioController();
