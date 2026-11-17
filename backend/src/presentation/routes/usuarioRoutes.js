const express = require('express');
const usuarioController = require('../controllers/UsuarioController');
const verificarToken = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');

// HU-21: solo el Propietario administra usuarios. La RLS de public.perfiles
// aplica la misma regla en la base de datos.
const router = express.Router();
router.use(verificarToken, verificarRol('propietario'));
router.get('/', (req, res) => usuarioController.listar(req, res));
router.patch('/:id', (req, res) => usuarioController.actualizar(req, res));

module.exports = router;
