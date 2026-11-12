const inventarioRepository = require('../../infraestructure/repositories/InventarioRepository');
const productosRepository = require('../../infraestructure/repositories/ProductosRepository');
const AgregarExistenciasDTO = require('../dto/AgregarExistenciasDTO');

const FUNCION_NO_INSTALADA = ['PGRST202', '42883'];

class InventarioService {
  async listar(client) {
    return inventarioRepository.listar(client);
  }

  /**
   * HU-18: resumen administrativo. Si la función SQL todavía no está instalada,
   * responde con el listado básico y deja comprometido, total y fecha en null,
   * para que la pantalla siga funcionando mientras se aplica la migración.
   */
  async listarResumen(client) {
    try {
      return { migracionPendiente: false, productos: await inventarioRepository.listarResumen(client) };
    } catch (error) {
      if (!FUNCION_NO_INSTALADA.includes(error.code)) throw error;
      const productos = await inventarioRepository.listar(client);
      return {
        migracionPendiente: true,
        productos: productos.map(producto => ({
          ...producto,
          comprometido: null,
          total: null,
          actualizado_en: null
        }))
      };
    }
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
