function verificarAdmin(req, res, next) {
  const correo = req.user?.email?.trim().toLowerCase();
  if (correo !== 'admin@gmail.com') {
    return res.status(403).json({ mensaje: 'Solo admin@gmail.com puede modificar el inventario' });
  }
  return next();
}

module.exports = verificarAdmin;
