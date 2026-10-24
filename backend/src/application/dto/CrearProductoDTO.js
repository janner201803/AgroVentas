class CrearProductoDTO {
  constructor(datos = {}) {
    this.nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
    this.cantidad = Number(datos.cantidad);
    this.precio = Number(datos.precio);
    this.und = typeof datos.und === 'string' ? datos.und.trim().toLowerCase() : '';
  }

  validar() {
    if (this.nombre.length < 2 || this.nombre.length > 120) {
      throw new Error('El nombre debe tener entre 2 y 120 caracteres');
    }
    if (!Number.isFinite(this.cantidad) || this.cantidad <= 0) {
      throw new Error('La cantidad disponible debe ser mayor que cero');
    }
    if (!['kg', 'und'].includes(this.und)) {
      throw new Error('Selecciona si el producto se maneja por kg o por unidad');
    }
    if (this.und === 'und' && !Number.isInteger(this.cantidad)) {
      throw new Error('La cantidad por unidades debe ser un número entero');
    }
    if (this.und === 'kg' && Math.abs(this.cantidad * 10 - Math.round(this.cantidad * 10)) > 1e-8) {
      throw new Error('La cantidad en kg debe usar incrementos de 0,1 kg');
    }
    if (!Number.isFinite(this.precio) || this.precio <= 0) {
      throw new Error('El precio debe ser mayor que cero');
    }
    return this;
  }
}

module.exports = CrearProductoDTO;
