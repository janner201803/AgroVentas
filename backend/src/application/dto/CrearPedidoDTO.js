class CrearPedidoDTO {
  constructor(datos) {
    this.id_producto = Number(datos.id_producto);
    this.cantidad = Number(datos.cantidad);
    this.metodo_pago = datos.metodo_pago;
    this.comprobante_url = datos.comprobante_url || null;
  }

  validar() {
    if (!Number.isInteger(this.id_producto) || this.id_producto <= 0) {
      throw new Error('Selecciona un producto válido');
    }

    if (!Number.isFinite(this.cantidad) || this.cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor que cero');
    }

    if (!['efectivo', 'consignacion'].includes(this.metodo_pago)) {
      throw new Error('Selecciona un método de pago válido');
    }

    if (
      this.metodo_pago === 'consignacion' &&
      !this.comprobante_url
    ) {
      throw new Error('Debes adjuntar el comprobante de pago');
    }

    return this;
  }
}

module.exports = CrearPedidoDTO;