// Regla de anticipación: un pedido para hoy se registra al menos 40 minutos antes de la entrega.
// No se conecta a Supabase: la hora actual y el repositorio se simulan.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'clave-de-prueba';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const pedidoService = require('../src/application/services/PedidoService');
const pedidoRepository = require('../src/infraestructure/repositories/PedidoRepository');

const originales = {
  fecha: pedidoService.fechaActualColombia,
  hora: pedidoService.horaActualColombia,
  crearConReserva: pedidoRepository.crearConReserva,
  horariosOcupados: pedidoRepository.horariosOcupados
};

let creados;

function fijarAhora(fecha, hora) {
  pedidoService.fechaActualColombia = () => fecha;
  pedidoService.horaActualColombia = () => hora;
}

const datos = (fecha_entrega, hora_entrega) => ({
  id_producto: 1, cantidad: 2, metodo_pago: 'efectivo', fecha_entrega, hora_entrega
});

beforeEach(() => {
  creados = [];
  pedidoRepository.crearConReserva = async pedido => { creados.push(pedido); return pedido; };
  pedidoRepository.horariosOcupados = async () => ['14:00'];
});

afterEach(() => {
  pedidoService.fechaActualColombia = originales.fecha;
  pedidoService.horaActualColombia = originales.hora;
  pedidoRepository.crearConReserva = originales.crearConReserva;
  pedidoRepository.horariosOcupados = originales.horariosOcupados;
});

test('a las 11:55 no se puede pedir para las 12:00', async () => {
  fijarAhora('2026-11-19', '11:55');
  await assert.rejects(pedidoService.crear(datos('2026-11-19', '12:00')), /40 minutos/);
  assert.equal(creados.length, 0);
});

test('con exactamente 40 minutos sí se puede', async () => {
  fijarAhora('2026-11-19', '11:20');
  await pedidoService.crear(datos('2026-11-19', '12:00'));
  assert.equal(creados.length, 1);
});

test('a las 11:21 ya no se puede para las 12:00, pero sí para las 13:00', async () => {
  fijarAhora('2026-11-19', '11:21');
  await assert.rejects(pedidoService.crear(datos('2026-11-19', '12:00')), /40 minutos/);
  await pedidoService.crear(datos('2026-11-19', '13:00'));
  assert.equal(creados.length, 1);
});

test('para mañana no aplica la anticipación', async () => {
  fijarAhora('2026-11-19', '23:50');
  await pedidoService.crear(datos('2026-11-20', '08:00'));
  assert.equal(creados.length, 1);
});

test('una fecha pasada sigue rechazándose', async () => {
  fijarAhora('2026-11-19', '07:00');
  await assert.rejects(pedidoService.crear(datos('2026-11-18', '15:00')), /pasado/);
});

test('los horarios de hoy marcan como no disponibles los que no cumplen la anticipación', async () => {
  fijarAhora('2026-11-19', '11:55');
  const horarios = await pedidoService.horariosDisponibles('2026-11-19');
  const disponibles = horarios.filter(h => h.disponible).map(h => h.hora);
  assert.deepEqual(disponibles, ['13:00', '15:00', '16:00']);
  assert.equal(horarios.find(h => h.hora === '14:00').ocupado, true);
});
