const inventarioRepository = require('../../infraestructure/repositories/InventarioRepository');
const CrearProductoDTO = require('../dto/CrearProductoDTO');

class InventarioService {
  async listar(client) {
    return inventarioRepository.listar(client);
  }

  async listarDisponibles(client) {
    return inventarioRepository.listarDisponibles(client);
  }

  async crear(datos, client) {
    const producto = new CrearProductoDTO(datos).validar();
    return inventarioRepository.crear({
      nombre: producto.nombre,
      cantidad: producto.cantidad,
      precio: producto.precio
    }, client);
  }
}

module.exports = new InventarioService();
