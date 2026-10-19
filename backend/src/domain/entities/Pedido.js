class Pedido {
  constructor({
    id,
    valor,
    cantidad,
    fecha_entrega,
    fecha_pedido,
    metodo_pago,
    estado,
    id_producto,
    id_usuario
  }) {
    this.id = id;
    this.valor = valor;
    this.cantidad = cantidad;
    this.fecha_entrega = fecha_entrega;
    this.fecha_pedido = fecha_pedido;
    this.metodo_pago = metodo_pago;
    this.estado = estado;
    this.id_producto = id_producto;
    this.id_usuario = id_usuario;
  }
}

module.exports = Pedido;