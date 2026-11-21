class CrearPedidoDTO {
  constructor(datos) {
    const lineas = datos.lineas === undefined ? [datos] : datos.lineas;
    if (!Array.isArray(lineas) || !lineas.length) throw new Error('Agrega productos al carrito');
    this.lineas = lineas.map(linea => ({
      id_producto: Number(linea?.id_producto),
      cantidad: Number(linea?.cantidad)
    }));
    this.metodo_pago = datos.metodo_pago;
    this.comprobante_url = datos.comprobante_url || null;
    this.fecha_entrega = datos.fecha_entrega;
    this.hora_entrega = datos.hora_entrega;
  }

  validar() {
    const ids = new Set();
    for (const { id_producto, cantidad } of this.lineas) {
      if (!Number.isSafeInteger(id_producto) || id_producto <= 0) throw new Error('Selecciona un producto válido');
      if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error('La cantidad debe ser mayor que cero');
      if (ids.has(id_producto)) throw new Error('Producto repetido en el carrito');
      ids.add(id_producto);
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
