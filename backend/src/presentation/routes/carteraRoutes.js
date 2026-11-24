const express = require('express');
const carteraController = require('../controllers/CarteraController');
const verificarToken = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');

const router = express.Router();
router.use(verificarToken, verificarRol('propietario', 'empleado'));
router.get('/', (req, res) => carteraController.listar(req, res));
router.post('/:id/abonos', (req, res) => carteraController.registrarAbono(req, res));

module.exports = router;
