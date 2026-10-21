const { randomUUID } = require('crypto');
const pedidoRepository = require('../../infraestructure/repositories/PedidoRepository');
const inventarioRepository = require('../../infraestructure/repositories/InventarioRepository');
const CrearPedidoDTO = require('../dto/CrearPedidoDTO');

class PedidoService {
  async crear(datos, idUsuario, client) {
    const dto = new CrearPedidoDTO(datos).validar();
    if (dto.fecha_entrega < this.fechaActualColombia()) {
      throw new Error('La fecha de entrega no puede estar en el pasado');
    }
    if (dto.fecha_entrega === this.fechaActualColombia() && dto.hora_entrega <= this.horaActualColombia()) {
      throw new Error('Ese horario ya pasó. Selecciona una hora posterior.');
    }
    const producto = await inventarioRepository.obtenerPorId(dto.id_producto, client);
    if (!producto || Number(producto.cantidad) <= 0) {
      throw new Error('El producto seleccionado no está disponible');
    }
    if (!Number.isFinite(Number(producto.precio)) || Number(producto.precio) <= 0) {
      throw new Error('El producto no tiene un precio válido configurado');
    }
    if (Number.isFinite(Number(producto.cantidad)) && dto.cantidad > Number(producto.cantidad)) {
      throw new Error('La cantidad solicitada supera el inventario disponible');
    }
    if (await pedidoRepository.horarioOcupado(dto.fecha_entrega, dto.hora_entrega, client)) {
      const error = new Error('Ese horario acaba de ser ocupado. Selecciona otro.');
      error.status = 409;
      throw error;
    }

    const pedido = {
      id: randomUUID(),
      valor: Math.round(Number(producto.precio) * dto.cantidad),
      cantidad: dto.cantidad,
      fecha_entrega: dto.fecha_entrega,
      hora_entrega: dto.hora_entrega,
      metodo_pago: dto.metodo_pago,
      estado: 'pendiente',
      id_producto: dto.id_producto,
      id_usuario: idUsuario
    };
    return pedidoRepository.crear(pedido, client);
  }

  async horariosDisponibles(fecha, client) {
    const fechaParsed = new Date(`${fecha}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || Number.isNaN(fechaParsed.getTime()) ||
      fechaParsed.toISOString().slice(0, 10) !== fecha) {
      throw new Error('Fecha inválida');
    }
    const horarios = Array.from({ length: 9 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
    const ocupados = await pedidoRepository.horariosOcupados(fecha, client);
    const hoy = this.fechaActualColombia();
    return horarios.map(hora => ({
      hora,
      ocupado: ocupados.includes(hora),
      disponible: fecha >= hoy && !ocupados.includes(hora) &&
        (fecha !== hoy || hora > this.horaActualColombia())
    }));
  }

  fechaActualColombia() {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valores = Object.fromEntries(partes.filter(parte => parte.type !== 'literal').map(parte => [parte.type, parte.value]));
    return `${valores.year}-${valores.month}-${valores.day}`;
  }

  horaActualColombia() {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(new Date());
  }

  async listarPorUsuario(idUsuario, client) {
    return await pedidoRepository.listarPorUsuario(idUsuario, client);
  }
}

module.exports = new PedidoService();
