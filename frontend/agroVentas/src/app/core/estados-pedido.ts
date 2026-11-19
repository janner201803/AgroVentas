// HU-08 / HU-12 / HU-13: estados de un pedido, etiquetas, transiciones y urgencia.
// El backend y la base de datos (cambiar_estado_pedido) aplican las mismas transiciones.

export type EstadoPedido = 'pendiente' | 'en_preparacion' | 'entregado' | 'cancelado';

export const ESTADOS_PEDIDO: EstadoPedido[] = ['pendiente', 'en_preparacion', 'entregado', 'cancelado'];

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
};

export const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: ['en_preparacion', 'cancelado'],
  en_preparacion: ['pendiente', 'entregado', 'cancelado'],
  entregado: [],
  cancelado: []
};

/** Texto del botón que lleva a cada estado. */
export const ACCION_HACIA: Record<EstadoPedido, string> = {
  pendiente: 'Volver a pendiente',
  en_preparacion: 'Pasar a preparación',
  entregado: 'Marcar entregado',
  cancelado: 'Cancelar pedido'
};

/** Estados que todavía requieren trabajo del personal. */
export const ESTADOS_POR_ATENDER: EstadoPedido[] = ['pendiente', 'en_preparacion'];

/**
 * Convierte el texto guardado a uno de los cuatro estados. Acepta los nombres
 * que se usaban antes de la migración 20261119 (confirmado, preparado, rechazado).
 */
export function normalizarEstado(estado: string | null | undefined): EstadoPedido | null {
  const valor = (estado ?? '').trim().toLowerCase();
  if (valor === 'pendiente') return 'pendiente';
  if (['en_preparacion', 'en preparacion', 'en preparación', 'confirmado', 'preparado'].includes(valor)) return 'en_preparacion';
  if (valor === 'entregado') return 'entregado';
  if (['cancelado', 'rechazado'].includes(valor)) return 'cancelado';
  return null;
}

export type Urgencia = 'atrasado' | 'hoy' | 'manana' | null;

export const ETIQUETA_URGENCIA: Record<Exclude<Urgencia, null>, string> = {
  atrasado: 'Atrasado',
  hoy: 'Entrega hoy',
  manana: 'Entrega mañana'
};

/** Fecha (AAAA-MM-DD) y hora (HH:MM) actuales en Colombia. */
export function ahoraColombia(fecha = new Date()): { dia: string; hora: string; manana: string } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(fecha).filter(p => p.type !== 'literal').map(p => [p.type, p.value])
  );
  const dia = `${partes['year']}-${partes['month']}-${partes['day']}`;
  const siguiente = new Date(`${dia}T12:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return { dia, hora: `${partes['hour']}:${partes['minute']}`, manana: siguiente.toISOString().slice(0, 10) };
}

/**
 * HU-13 — criterio de urgencia (solo para pedidos por atender):
 *  - "atrasado": la fecha y hora de entrega ya pasaron.
 *  - "hoy": se entrega hoy y la hora aún no llega.
 *  - "manana": se entrega mañana.
 * Se consideran urgentes "atrasado" y "hoy".
 */
export function calcularUrgencia(
  estado: string | null | undefined,
  fechaEntrega: string | null | undefined,
  horaEntrega: string | null | undefined,
  ahora = ahoraColombia()
): Urgencia {
  const normalizado = normalizarEstado(estado);
  if (!normalizado || !ESTADOS_POR_ATENDER.includes(normalizado) || !fechaEntrega) return null;
  const hora = (horaEntrega ?? '23:59').slice(0, 5);
  if (fechaEntrega < ahora.dia || (fechaEntrega === ahora.dia && hora <= ahora.hora)) return 'atrasado';
  if (fechaEntrega === ahora.dia) return 'hoy';
  if (fechaEntrega === ahora.manana) return 'manana';
  return null;
}
