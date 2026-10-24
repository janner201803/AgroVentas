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
    let producto;
    try {
      producto = new CrearProductoDTO(datos).validar();
    } catch (error) {
      error.status = 400;
      throw error;
    }
    return inventarioRepository.crear({
      nombre: producto.nombre,
      cantidad: producto.cantidad,
      precio: producto.precio,
      und: producto.und
    }, client);
  }
}

module.exports = new InventarioService();
