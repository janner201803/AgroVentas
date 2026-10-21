require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pedidoRoutes = require('./presentation/routes/pedidoRoutes');
const inventarioRoutes = require('./presentation/routes/inventarioRoutes');

const app = express();

app.use(cors({
  origin: 'http://localhost:4200'
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de AgroVentas funcionando'
  });
});

app.use('/api/pedidos', pedidoRoutes);
app.use('/api/inventario', inventarioRoutes);

module.exports = app;
