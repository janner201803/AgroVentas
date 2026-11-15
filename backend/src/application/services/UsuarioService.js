const perfilRepository = require('../../infraestructure/repositories/PerfilRepository');

const ROLES = ['propietario', 'empleado', 'cliente'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorValidacion(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

/** HU-21: gestión de usuarios por parte del Propietario. */
class UsuarioService {
  async listar(client) {
    return perfilRepository.listar(client);
  }

  /**
   * Cambia el rol y/o el estado de una cuenta.
   * `idSolicitante` es el Propietario que hace el cambio: no puede quitarse su
   * propio rol ni desactivarse (la base de datos también lo impide).
   */
  async actualizar(id, datos, idSolicitante, client) {
    if (typeof id !== 'string' || !UUID.test(id)) {
      throw errorValidacion('El usuario indicado no es válido');
    }

    const cambios = {};
    if (datos?.rol !== undefined) {
      if (!ROLES.includes(datos.rol)) throw errorValidacion('Selecciona un rol válido: Propietario, Empleado o Cliente');
      cambios.rol = datos.rol;
    }
    if (datos?.activo !== undefined) {
      if (typeof datos.activo !== 'boolean') throw errorValidacion('El estado de la cuenta debe ser activo o inactivo');
      cambios.activo = datos.activo;
    }
    if (Object.keys(cambios).length === 0) {
      throw errorValidacion('No hay cambios para guardar');
    }

    if (id === idSolicitante && (
      (cambios.rol !== undefined && cambios.rol !== 'propietario') || cambios.activo === false
    )) {
      throw errorValidacion('No puedes quitarte el rol de Propietario ni desactivar tu propia cuenta', 409);
    }

    const perfil = await perfilRepository.actualizar(id, cambios, client);
    if (!perfil) throw errorValidacion('El usuario no existe', 404);
    return perfil;
  }
}

module.exports = new UsuarioService();
