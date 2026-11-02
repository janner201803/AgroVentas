const inventarioRepository = require('../../infraestructure/repositories/InventarioRepository');
const productosRepository = require('../../infraestructure/repositories/ProductosRepository');
const AgregarExistenciasDTO = require('../dto/AgregarExistenciasDTO');

class InventarioService {
  async listar(client) {
    return inventarioRepository.listar(client);
  }

  async listarDisponibles(client) {
    return inventarioRepository.listarDisponibles(client);
  }

  async agregarExistencias(datos, client) {
    let dto;
    try {
      dto = new AgregarExistenciasDTO(datos);
      if (!Number.isInteger(dto.id_producto) || dto.id_producto <= 0) {
        throw new Error('Selecciona un producto válido del catálogo');
      }
      if (!Number.isFinite(dto.cantidad) || dto.cantidad <= 0) {
        throw new Error('La cantidad a sumar debe ser mayor que cero');
      }
    } catch (error) {
      error.status = 400;
      throw error;
    }

    const producto = await productosRepository.obtenerPorId(dto.id_producto, client);
    if (!producto) {
      const error = new Error('El producto seleccionado no existe en el catálogo');
      error.status = 404;
      throw error;
    }
    if (!Number.isFinite(Number(producto.precio)) || Number(producto.precio) <= 0) {
      const error = new Error('Configura un precio mayor que cero para este producto en el catálogo antes de agregar existencias');
      error.status = 400;
      throw error;
    }

    try {
      dto.validar(producto.unidad);
    } catch (error) {
      error.status = 400;
      throw error;
    }

    return inventarioRepository.agregarExistencias(dto, client);
  }
}

module.exports = new InventarioService();
