const clienteService = require('../../application/services/ClienteService');

class ClienteController {
  async registrar(req, res) {
    try {
      const id = await clienteService.registrar(req.body, req.supabase);
      return res.status(201).json({ mensaje: 'Cliente registrado', id });
    } catch (error) {
      console.error('[ClienteController.registrar] Falló el registro:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible registrar al cliente' });
    }
  }

  async listar(req, res) {
    try {
      const incluirInactivos = req.query.incluirInactivos === 'true';
      const clientes = await clienteService.listar(req.query.buscar, incluirInactivos, req.supabase);
      return res.status(200).json(clientes);
    } catch (error) {
      console.error('[ClienteController.listar] Falló la consulta:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar los clientes' });
    }
  }

  async detalle(req, res) {
    try {
      return res.status(200).json(await clienteService.detalle(req.params.id, req.supabase));
    } catch (error) {
      console.error('[ClienteController.detalle] Falló la consulta:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar la ficha' });
    }
  }

  async actualizar(req, res) {
    try {
      const cliente = await clienteService.actualizar(req.params.id, req.body, req.supabase);
      return res.status(200).json({ mensaje: 'Ficha comercial actualizada', cliente });
    } catch (error) {
      console.error('[ClienteController.actualizar] Falló la actualización:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible actualizar la ficha' });
    }
  }
}

module.exports = new ClienteController();
