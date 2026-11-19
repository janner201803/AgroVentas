// Pruebas de HU-12 (cambiar estado) y HU-13 (pedidos para el personal).
// No se conectan a Supabase: el token, el perfil y las llamadas RPC se simulan.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'clave-de-prueba';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../src/infraestructure/database/supabase');
const perfilRepository = require('../src/infraestructure/repositories/PerfilRepository');
const pedidoRepository = require('../src/infraestructure/repositories/PedidoRepository');
const { puedeCambiar } = require('../src/domain/entities/EstadoPedido');
const app = require('../src/app');

const ROLES = { propietario: 'propietario', empleado: 'empleado', cliente: 'cliente' };

const originales = {
  getClaims: supabase.auth.getClaims,
  forUser: supabase.forUser,
  obtenerPorId: perfilRepository.obtenerPorId
};

let servidor;
let base;
let llamadasRpc;
let respuestaRpc;

before(async () => {
  supabase.auth.getClaims = async token => ({
    data: { claims: { sub: token, role: 'authenticated', email: `${token}@prueba.co` } },
    error: null
  });
  perfilRepository.obtenerPorId = async id => (ROLES[id] ? { id, rol: ROLES[id], activo: true } : null);
  // Cliente de Supabase falso: registra las llamadas RPC y devuelve respuestaRpc.
  supabase.forUser = () => ({
    rpc: async (nombre, parametros) => {
      llamadasRpc.push({ nombre, parametros });
      return respuestaRpc(nombre, parametros);
    }
  });
  await new Promise(resolve => { servidor = app.listen(0, resolve); });
  base = `http://127.0.0.1:${servidor.address().port}/api/pedidos`;
});

after(() => {
  supabase.auth.getClaims = originales.getClaims;
  supabase.forUser = originales.forUser;
  perfilRepository.obtenerPorId = originales.obtenerPorId;
  servidor.close();
});

beforeEach(() => {
  llamadasRpc = [];
  respuestaRpc = () => ({ data: [], error: null });
});

const pedir = (ruta, token, opciones = {}) => fetch(`${base}${ruta}`, {
  ...opciones,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opciones.headers || {}) }
});
const cambiar = (id, cuerpo, token = 'empleado') =>
  pedir(`/${id}/estado`, token, { method: 'PATCH', body: JSON.stringify(cuerpo) });

test('transiciones permitidas por estado', () => {
  assert.equal(puedeCambiar('pendiente', 'en_preparacion'), true);
  assert.equal(puedeCambiar('pendiente', 'entregado'), false);
  assert.equal(puedeCambiar('en_preparacion', 'entregado'), true);
  assert.equal(puedeCambiar('en_preparacion', 'pendiente'), true);
  assert.equal(puedeCambiar('entregado', 'cancelado'), false);
  assert.equal(puedeCambiar('cancelado', 'pendiente'), false);
});

test('Propietario y Empleado consultan los pedidos de gestión', async () => {
  respuestaRpc = () => ({ data: [{ id: 'p1', estado: 'pendiente' }], error: null });
  for (const token of ['propietario', 'empleado']) {
    const respuesta = await pedir('/gestion', token);
    assert.equal(respuesta.status, 200, token);
    assert.deepEqual(await respuesta.json(), [{ id: 'p1', estado: 'pendiente' }]);
  }
  assert.deepEqual(llamadasRpc[0], { nombre: 'pedidos_personal', parametros: { p_desde: null, p_hasta: null } });
});

test('el Cliente no accede a la gestión ni cambia estados (403)', async () => {
  assert.equal((await pedir('/gestion', 'cliente')).status, 403);
  assert.equal((await cambiar('p1', { estado: 'entregado' }, 'cliente')).status, 403);
  assert.equal(llamadasRpc.length, 0);
});

test('el rango de fechas se envía a la base y se valida', async () => {
  await pedir('/gestion?desde=2026-11-01&hasta=2026-11-30', 'empleado');
  assert.deepEqual(llamadasRpc[0].parametros, { p_desde: '2026-11-01', p_hasta: '2026-11-30' });

  assert.equal((await pedir('/gestion?desde=2026-13-01', 'empleado')).status, 400);
  assert.equal((await pedir('/gestion?desde=2026-11-30&hasta=2026-11-01', 'empleado')).status, 400);
  assert.equal(llamadasRpc.length, 1);
});

test('cambiar estado envía estado y nota recortada', async () => {
  respuestaRpc = () => ({ data: { id: 'p1', estado: 'en_preparacion' }, error: null });
  const respuesta = await cambiar('p1', { estado: 'en_preparacion', nota: '  alistar temprano  ' });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(llamadasRpc[0], {
    nombre: 'cambiar_estado_pedido',
    parametros: { p_id_pedido: 'p1', p_estado: 'en_preparacion', p_nota: 'alistar temprano' }
  });
  assert.equal((await respuesta.json()).pedido.estado, 'en_preparacion');
});

test('rechaza estados desconocidos y notas largas sin llamar a la base (400)', async () => {
  for (const cuerpo of [{ estado: 'confirmado' }, { estado: 'entregado', nota: 'x'.repeat(501) }, { estado: 'entregado', nota: 5 }]) {
    assert.equal((await cambiar('p1', cuerpo)).status, 400, JSON.stringify(cuerpo).slice(0, 40));
  }
  assert.equal(llamadasRpc.length, 0);
});

test('una transición no permitida por la base responde 409 con su mensaje', async () => {
  respuestaRpc = () => ({ data: null, error: { code: 'P0001', message: 'No se puede pasar un pedido de "entregado" a "pendiente"' } });
  const respuesta = await cambiar('p1', { estado: 'pendiente' });
  assert.equal(respuesta.status, 409);
  assert.match((await respuesta.json()).mensaje, /No se puede pasar/);
});

test('un pedido inexistente responde 404', async () => {
  respuestaRpc = () => ({ data: null, error: { code: 'P0002', message: 'El pedido no existe' } });
  assert.equal((await cambiar('no-existe', { estado: 'cancelado' })).status, 404);
});

test('sin la migración, la gestión responde 503', async () => {
  respuestaRpc = () => ({ data: null, error: { code: 'PGRST202', message: 'no existe' } });
  const respuesta = await pedir('/gestion', 'propietario');
  assert.equal(respuesta.status, 503);
  assert.match((await respuesta.json()).mensaje, /20261119/);
});

test('el historial lo puede pedir el cliente; la base decide si es su pedido', async () => {
  respuestaRpc = () => ({ data: [{ estado_nuevo: 'pendiente' }], error: null });
  assert.equal((await pedir('/p1/historial', 'cliente')).status, 200);
  respuestaRpc = () => ({ data: null, error: { code: '42501', message: 'No puedes consultar el historial de este pedido' } });
  assert.equal((await pedir('/p2/historial', 'cliente')).status, 403);
});
