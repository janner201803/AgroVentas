class CrearPedidoInternoDTO {
  constructor(datos) {
    this.cliente_id = Number(datos?.cliente_id);
    this.canal_origen = datos?.canal_origen;
    this.lineas = Array.isArray(datos?.lineas) ? datos.lineas.map(linea => ({
      id_producto: Number(linea?.id_producto),
      cantidad: Number(linea?.cantidad)
    })) : [];
    this.fecha_entrega = datos?.fecha_entrega;
    this.hora_entrega = datos?.hora_entrega;
  }

  validar() {
    if (!Number.isSafeInteger(this.cliente_id) || this.cliente_id <= 0) {
      throw new Error('Selecciona una ficha de cliente válida');
    }
    if (!['whatsapp', 'telefono', 'presencial'].includes(this.canal_origen)) {
      throw new Error('Selecciona WhatsApp, teléfono o presencial');
    }
    if (!this.lineas.length) throw new Error('Agrega productos al carrito');
    const ids = new Set();
    for (const { id_producto, cantidad } of this.lineas) {
      if (!Number.isSafeInteger(id_producto) || id_producto <= 0) throw new Error('Selecciona un producto válido');
      if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error('La cantidad debe ser mayor que cero');
      if (ids.has(id_producto)) throw new Error('Producto repetido en el carrito');
      ids.add(id_producto);
    }
    const fechaParsed = new Date(`${this.fecha_entrega}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.fecha_entrega || '') ||
      Number.isNaN(fechaParsed.getTime()) || fechaParsed.toISOString().slice(0, 10) !== this.fecha_entrega) {
      throw new Error('Selecciona una fecha de entrega válida');
    }
    if (!/^(0[89]|1[0-6]):00$/.test(this.hora_entrega || '')) {
      throw new Error('Selecciona un horario entre 8:00 y 16:00');
    }
    return this;
  }
}

module.exports = CrearPedidoInternoDTO;
