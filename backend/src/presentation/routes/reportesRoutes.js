const express = require('express');
const reportesController = require('../controllers/ReportesController');
const verificarToken = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');

const router = express.Router();
router.use(verificarToken, verificarRol('propietario'));
router.get('/', (req, res) => reportesController.resumen(req, res));

module.exports = router;
