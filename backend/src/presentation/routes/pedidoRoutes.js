const express = require('express');
const router = express.Router();

const pedidoController = require(
  '../controllers/PedidoController.js'
);

const verificarToken = require('../middleware/verificarToken');

router.post('/', verificarToken, (req, res) =>
  pedidoController.crear(req, res)
);

router.get('/', verificarToken, (req, res) =>
  pedidoController.listar(req, res)
);

module.exports = router;