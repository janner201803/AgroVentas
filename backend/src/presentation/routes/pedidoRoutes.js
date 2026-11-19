const express = require('express');
const router = express.Router();

const pedidoController = require(
  '../controllers/PedidoController.js'
);

const verificarToken = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');

// HU-12 / HU-13: gestión de pedidos para Propietario y Empleado.
const soloPersonal = verificarRol('propietario', 'empleado');

router.get('/horarios', verificarToken, (req, res) =>
  pedidoController.horarios(req, res)
);

router.post('/', verificarToken, (req, res) =>
  pedidoController.crear(req, res)
);

router.get('/', verificarToken, (req, res) =>
  pedidoController.listar(req, res)
);

router.get('/gestion', verificarToken, soloPersonal, (req, res) =>
  pedidoController.gestion(req, res)
);

router.patch('/:id/estado', verificarToken, soloPersonal, (req, res) =>
  pedidoController.cambiarEstado(req, res)
);

// El cliente dueño del pedido también puede ver su historial; lo decide la base de datos.
router.get('/:id/historial', verificarToken, (req, res) =>
  pedidoController.historial(req, res)
);

module.exports = router;
