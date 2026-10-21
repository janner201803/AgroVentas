const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/InventarioController');
const verificarToken = require('../middleware/verificarToken');
const verificarAdmin = require('../middleware/verificarAdmin');

router.use(verificarToken);
router.get('/', (req, res) => inventarioController.listar(req, res));
router.post('/', verificarAdmin, (req, res) => inventarioController.crear(req, res));

module.exports = router;
