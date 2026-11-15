const ROLES = ['propietario', 'empleado', 'cliente'];

const NOMBRES = {
  propietario: 'el Propietario',
  empleado: 'el Empleado',
  cliente: 'el Cliente'
};

/**
 * HU-01: permite continuar solo si el perfil cargado por verificarToken tiene
 * uno de los roles indicados. Uso: router.get('/x', verificarRol('propietario'), ...)
 */
function verificarRol(...rolesPermitidos) {
  const desconocidos = rolesPermitidos.filter(rol => !ROLES.includes(rol));
  if (rolesPermitidos.length === 0 || desconocidos.length > 0) {
    throw new Error(`verificarRol: roles no válidos (${desconocidos.join(', ') || 'ninguno'})`);
  }

  const quienes = rolesPermitidos.map(rol => NOMBRES[rol]).join(' o ');

  return function (req, res, next) {
    if (req.perfilMigracionPendiente) {
      return res.status(503).json({
        mensaje: 'Falta instalar la migración de roles (20261115_roles_perfiles.sql) en Supabase.'
      });
    }
    if (!req.perfil || !rolesPermitidos.includes(req.perfil.rol)) {
      return res.status(403).json({ mensaje: `Solo ${quienes} puede realizar esta acción` });
    }
    return next();
  };
}

verificarRol.ROLES = ROLES;

module.exports = verificarRol;
