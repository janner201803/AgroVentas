const supabase = require('../../infraestructure/database/supabase');

async function verificarToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
    }

    const token = authorization.substring(7);

    const { data, error: errorAuth } = await supabase.auth.getUser(token);

    if (errorAuth || !data?.user) {
      console.log('Error Supabase:', errorAuth?.message, '| status:', errorAuth?.status);
      return res
        .status(401)
        .json({ mensaje: 'Token inválido o sesión expirada' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email
    };

    next();
  } catch (err) {
    console.log('Error catch:', err.message);
    return res
      .status(401)
      .json({ mensaje: 'No se pudo verificar la autenticación' });
  }
}

module.exports = verificarToken;