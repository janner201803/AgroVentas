const supabase = require('../../infraestructure/database/supabase');

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
    req.validacionTokenMs = performance.now() - inicioValidacion;
    req.supabase = supabase.forUser(token);

    next();
  } catch (err) {
    console.error('[verificarToken] No se pudo validar la sesión:', err.message);
    return res
      .status(err.status || 401)
      .json({ mensaje: err.message || 'No se pudo verificar la autenticación' });
  }
}

module.exports = verificarToken;
