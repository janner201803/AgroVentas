class CrearPedidoDTO {
  constructor(datos) {
    this.id_producto = Number(datos.id_producto);
    this.cantidad = Number(datos.cantidad);
    this.metodo_pago = datos.metodo_pago;
    this.comprobante_url = datos.comprobante_url || null;
    this.fecha_entrega = datos.fecha_entrega;
    this.hora_entrega = datos.hora_entrega;
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

    const fechaParsed = new Date(`${this.fecha_entrega}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.fecha_entrega || '') ||
      Number.isNaN(fechaParsed.getTime()) || fechaParsed.toISOString().slice(0, 10) !== this.fecha_entrega) {
      throw new Error('Selecciona una fecha de entrega válida');
    }

    if (!/^(0[89]|1[0-6]):00$/.test(this.hora_entrega || '')) {
      throw new Error('Selecciona un horario disponible entre 8:00 y 16:00');
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
