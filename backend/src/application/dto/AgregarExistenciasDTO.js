function unidadNormalizada(unidad) {
  const valor = String(unidad || '').trim().toLowerCase();
  if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(valor)) return 'kg';
  if (['und', 'unidad', 'unidades'].includes(valor)) return 'und';
  return null;
}

class AgregarExistenciasDTO {
  constructor(datos = {}) {
    this.id_producto = Number(datos.id_producto);
    this.cantidad = Number(datos.cantidad);
  }

  validar(unidad) {
    if (!Number.isInteger(this.id_producto) || this.id_producto <= 0) {
      throw new Error('Selecciona un producto válido del catálogo');
    }
    if (!Number.isFinite(this.cantidad) || this.cantidad <= 0) {
      throw new Error('La cantidad a sumar debe ser mayor que cero');
    }
    const unidadCanonica = unidadNormalizada(unidad);
    if (!unidadCanonica) throw new Error('El producto tiene una unidad no reconocida en el catálogo');
    if (unidadCanonica === 'und' && !Number.isInteger(this.cantidad)) {
      throw new Error('La cantidad de unidades debe ser un número entero');
    }
    if (unidadCanonica === 'kg' && Math.abs(this.cantidad * 10 - Math.round(this.cantidad * 10)) > 1e-8) {
      throw new Error('La cantidad en kg debe usar incrementos de 0,1 kg');
    }
    return this;
  }
}

module.exports = AgregarExistenciasDTO;
