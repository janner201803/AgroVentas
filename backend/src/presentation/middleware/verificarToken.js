const { createClient } = require('@supabase/supabase-js');

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

async function verificarToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        mensaje: 'Debes iniciar sesión'
      });
    }

    const token = authorization.substring(7);

    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        mensaje: 'Token inválido o sesión expirada'
      });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email
    };

    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: 'No se pudo verificar la autenticación'
    });
  }
}

module.exports = verificarToken;