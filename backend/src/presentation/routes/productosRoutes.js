const express = require('express');
const productosController = require('../controllers/ProductosController');
const verificarToken = require('../middleware/verificarToken');

const router = express.Router();
router.use(verificarToken);
router.get('/', (req, res) => productosController.listar(req, res));

module.exports = router;
