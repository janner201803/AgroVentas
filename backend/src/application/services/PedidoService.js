const { randomUUID } = require('crypto');
const pedidoRepository = require('../../infraestructure/repositories/PedidoRepository');
const CrearPedidoDTO = require('../dto/CrearPedidoDTO');
const CrearPedidoInternoDTO = require('../dto/CrearPedidoInternoDTO');
const { esEstadoValido } = require('../../domain/entities/EstadoPedido');

function errorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
}

// Un pedido para hoy debe registrarse con al menos esta anticipación.
const ANTICIPACION_MINUTOS = 40;

function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function esFechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const fechaParsed = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(fechaParsed.getTime()) && fechaParsed.toISOString().slice(0, 10) === fecha;
}

class PedidoService {
  async crear(datos, client) {
    const dto = new CrearPedidoDTO(datos).validar();
    if (dto.fecha_entrega < this.fechaActualColombia()) {
      throw new Error('La fecha de entrega no puede estar en el pasado');
    }
    if (!this.cumpleAnticipacion(dto.fecha_entrega, dto.hora_entrega)) {
      throw new Error(`Los pedidos para hoy se registran con al menos ${ANTICIPACION_MINUTOS} minutos de anticipación. Selecciona una hora posterior.`);
    }

    const pedido = {
      id: randomUUID(),
      lineas: dto.lineas,
      fecha_entrega: dto.fecha_entrega,
      hora_entrega: dto.hora_entrega,
      metodo_pago: dto.metodo_pago
    };
    return pedidoRepository.crearConReserva(pedido, client);
  }

  async crearInterno(datos, client) {
    const dto = new CrearPedidoInternoDTO(datos).validar();
    if (dto.fecha_entrega < this.fechaActualColombia()) {
      throw errorValidacion('La fecha de entrega no puede estar en el pasado');
    }
    if (!this.cumpleAnticipacion(dto.fecha_entrega, dto.hora_entrega)) {
      throw errorValidacion(`Los pedidos para hoy se registran con al menos ${ANTICIPACION_MINUTOS} minutos de anticipación. Selecciona una hora posterior.`);
    }
    return pedidoRepository.crearInterno({
      id: randomUUID(),
      cliente_id: dto.cliente_id,
      canal_origen: dto.canal_origen,
      lineas: dto.lineas,
      fecha_entrega: dto.fecha_entrega,
      hora_entrega: dto.hora_entrega
    }, client);
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
      disponible: fecha >= hoy && !ocupados.includes(hora) && this.cumpleAnticipacion(fecha, hora)
    }));
  }

  /** Mañana o después siempre cumple; hoy, la entrega debe ser al menos 40 minutos después de ahora. */
  cumpleAnticipacion(fecha, hora) {
    const hoy = this.fechaActualColombia();
    if (fecha !== hoy) return fecha > hoy;
    return aMinutos(hora) - aMinutos(this.horaActualColombia()) >= ANTICIPACION_MINUTOS;
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

  /** HU-13: pedidos para el personal, opcionalmente por rango de fecha de entrega. */
  async listarGestion({ desde, hasta } = {}, client) {
    for (const [nombre, valor] of [['desde', desde], ['hasta', hasta]]) {
      if (valor !== undefined && valor !== '' && !esFechaValida(valor)) {
        throw errorValidacion(`La fecha "${nombre}" no es válida`);
      }
    }
    if (desde && hasta && desde > hasta) {
      throw errorValidacion('La fecha inicial no puede ser posterior a la final');
    }
    return pedidoRepository.listarGestion({ desde: desde || null, hasta: hasta || null }, client);
  }

  /** HU-12: la transición la valida la base de datos; aquí se revisan los datos de entrada. */
  async cambiarEstado(id, datos, client) {
    if (typeof id !== 'string' || id.trim() === '' || id.length > 64) {
      throw errorValidacion('El pedido indicado no es válido');
    }
    const estado = datos?.estado;
    if (!esEstadoValido(estado)) {
      throw errorValidacion('Selecciona un estado válido: pendiente, en_preparacion, entregado o cancelado');
    }
    let nota = datos?.nota ?? null;
    if (nota !== null) {
      if (typeof nota !== 'string') throw errorValidacion('La nota debe ser texto');
      nota = nota.trim() || null;
      if (nota && nota.length > 500) throw errorValidacion('La nota no puede superar 500 caracteres');
    }
    if (estado === 'entregado') {
      if (!['efectivo', 'transferencia', 'credito'].includes(datos.pago)) {
        throw errorValidacion('Confirma el método de pago antes de entregar');
      }
      return pedidoRepository.entregar(id, datos.pago, nota, client);
    }
    return pedidoRepository.cambiarEstado(id, estado, nota, client);
  }

  async historial(id, client) {
    if (typeof id !== 'string' || id.trim() === '' || id.length > 64) {
      throw errorValidacion('El pedido indicado no es válido');
    }
    return pedidoRepository.historial(id, client);
  }
}

module.exports = new PedidoService();
module.exports.ANTICIPACION_MINUTOS = ANTICIPACION_MINUTOS;
