const supabase = require('../../infraestructure/database/supabase');
const perfilRepository = require('../../infraestructure/repositories/PerfilRepository');

async function verificarToken(req, res, next) {
  try {
    const inicioValidacion = performance.now();
    req.inicioSolicitudMs = inicioValidacion;
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
    }

    const token = authorization.substring(7);

    let temporizador;
    let resultadoAuth;
    try {
      resultadoAuth = await Promise.race([
        supabase.auth.getClaims(token),
        new Promise((_, reject) => {
          temporizador = setTimeout(() => {
            const error = new Error('La verificación de sesión excedió el tiempo de espera');
            error.status = 504;
            reject(error);
          }, 10_000);
        })
      ]);
    } finally {
      clearTimeout(temporizador);
    }
    const { data, error: errorAuth } = resultadoAuth;
    const claims = data?.claims;

    if (errorAuth || typeof claims?.sub !== 'string' || claims.role !== 'authenticated') {
      console.log('Error Supabase:', errorAuth?.message, '| status:', errorAuth?.status);
      return res
        .status(401)
        .json({ mensaje: 'Token inválido o sesión expirada' });
    }

    req.user = {
      id: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : undefined
    };
    req.supabase = supabase.forUser(token);

    // HU-01 / HU-21: rol y estado de la cuenta. Si la migración de roles aún no
    // está aplicada, se continúa sin perfil (las rutas con verificarRol
    // responderán 503) para no romper las pantallas de clientes.
    try {
      req.perfil = await perfilRepository.obtenerPorId(req.user.id, req.supabase);
    } catch (errorPerfil) {
      if (!errorPerfil.migracionPendiente) throw errorPerfil;
      console.warn('[verificarToken]', errorPerfil.message);
      req.perfil = null;
      req.perfilMigracionPendiente = true;
    }

    if (req.perfil && req.perfil.activo === false) {
      return res.status(403).json({
        mensaje: 'Tu cuenta está desactivada. Comunícate con el propietario.',
        codigo: 'cuenta_desactivada'
      });
    }

    req.validacionTokenMs = performance.now() - inicioValidacion;
    next();
  } catch (err) {
    console.error('[verificarToken] No se pudo validar la sesión:', err.message);
    return res
      .status(err.status || 401)
      .json({ mensaje: err.message || 'No se pudo verificar la autenticación' });
  }
}

module.exports = verificarToken;
