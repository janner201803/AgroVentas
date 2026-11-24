const express = require('express');
const clienteController = require('../controllers/ClienteController');
const verificarToken = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');

const router = express.Router();
router.use(verificarToken, verificarRol('propietario', 'empleado'));
router.get('/', (req, res) => clienteController.listar(req, res));
router.post('/', (req, res) => clienteController.registrar(req, res));
router.get('/:id', (req, res) => clienteController.detalle(req, res));
router.patch('/:id', (req, res) => clienteController.actualizar(req, res));

module.exports = router;
