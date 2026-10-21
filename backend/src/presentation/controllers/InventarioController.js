const inventarioService = require('../../application/services/InventarioService');

class InventarioController {
  async listar(req, res) {
    try {
      const productos = req.query.disponibles === 'true'
        ? await inventarioService.listarDisponibles(req.supabase)
        : await inventarioService.listar(req.supabase);
      return res.status(200).json(productos);
    } catch (error) {
      console.error('[InventarioController.listar] Error consultando Supabase:', error.message);
      return res.status(500).json({ mensaje: 'No fue posible consultar el inventario' });
    }
  }

  async crear(req, res) {
    try {
      const producto = await inventarioService.crear(req.body, req.supabase);
      return res.status(201).json({ mensaje: 'Producto agregado al inventario', producto });
    } catch (error) {
      let resultadoRls = null;
      let errorRls = null;
      try {
        const verificacion = await req.supabase.rpc('es_administrador');
        resultadoRls = verificacion.data;
        errorRls = verificacion.error?.message || null;
      } catch (errorVerificacion) {
        errorRls = errorVerificacion.message;
      }
      console.error('[InventarioController.crear] Falló la inserción:', {
        correoAdminValidadoPorBackend: req.user?.email?.trim().toLowerCase() === 'admin@gmail.com',
        esAdministradorSegunSupabase: resultadoRls,
        errorVerificacionRls: errorRls,
        errorInsercion: error.message
      });
      return res.status(400).json({ mensaje: error.message });
    }
  }

}

module.exports = new InventarioController();
