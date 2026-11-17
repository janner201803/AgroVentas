const usuarioService = require('../../application/services/UsuarioService');

class UsuarioController {
  async listar(req, res) {
    try {
      return res.status(200).json(await usuarioService.listar(req.supabase));
    } catch (error) {
      console.error('[UsuarioController.listar] Falló la consulta de usuarios:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible consultar los usuarios' });
    }
  }

  async actualizar(req, res) {
    try {
      const usuario = await usuarioService.actualizar(req.params.id, req.body, req.user.id, req.supabase);
      return res.status(200).json({ mensaje: 'Usuario actualizado', usuario });
    } catch (error) {
      console.error('[UsuarioController.actualizar] Falló la actualización:', { codigo: error.code, error: error.message });
      return res.status(error.status || 500).json({ mensaje: error.message || 'No fue posible actualizar el usuario' });
    }
  }
}

module.exports = new UsuarioController();
