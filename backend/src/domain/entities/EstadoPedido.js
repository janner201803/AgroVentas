// HU-12: estados de un pedido y transiciones permitidas.
// La base de datos (cambiar_estado_pedido) aplica las mismas reglas.

const ESTADOS = ['pendiente', 'en_preparacion', 'entregado', 'cancelado'];

const TRANSICIONES = {
  pendiente: ['en_preparacion', 'cancelado'],
  en_preparacion: ['pendiente', 'entregado', 'cancelado'],
  entregado: [],
  cancelado: []
};

function esEstadoValido(estado) {
  return ESTADOS.includes(estado);
}

function puedeCambiar(desde, hacia) {
  return (TRANSICIONES[desde] || []).includes(hacia);
}

module.exports = { ESTADOS, TRANSICIONES, esEstadoValido, puedeCambiar };
