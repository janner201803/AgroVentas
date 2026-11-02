const productosRepository = require('../../infraestructure/repositories/ProductosRepository');

class ProductosService {
  async listar(client) {
    return productosRepository.listar(client);
  }

  async obtenerPorId(id, client) {
    return productosRepository.obtenerPorId(id, client);
  }
}

module.exports = new ProductosService();
