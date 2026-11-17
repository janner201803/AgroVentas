const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/InventarioController');
const verificarToken = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');

// HU-17 / HU-18: Propietario y Empleado consultan el resumen y registran entradas.
// La base de datos (es_personal, migración 20261116) aplica la misma regla.
// El catálogo de productos y sus precios siguen siendo solo del Propietario.
const soloPersonal = verificarRol('propietario', 'empleado');

router.use(verificarToken);
router.get('/', (req, res) => inventarioController.listar(req, res));
router.get('/resumen', soloPersonal, (req, res) => inventarioController.resumen(req, res));
router.post('/', soloPersonal, (req, res) => inventarioController.agregarExistencias(req, res));

module.exports = router;
