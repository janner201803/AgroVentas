class CrearProductoDTO {
  constructor(datos = {}) {
    this.nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
    this.cantidad = Number(datos.cantidad);
    this.precio = Number(datos.precio);
  }

  validar() {
    if (this.nombre.length < 2 || this.nombre.length > 120) {
      throw new Error('El nombre debe tener entre 2 y 120 caracteres');
    }
    if (!Number.isFinite(this.cantidad) || this.cantidad <= 0) {
      throw new Error('La cantidad disponible debe ser mayor que cero');
    }
    if (!Number.isFinite(this.precio) || this.precio <= 0) {
      throw new Error('El precio debe ser mayor que cero');
    }
    return this;
  }
}

module.exports = CrearProductoDTO;
