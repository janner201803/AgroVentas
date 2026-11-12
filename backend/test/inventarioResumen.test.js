// Pruebas de HU-18 (resumen de inventario). No se conectan a Supabase:
// la verificación del token y el repositorio se reemplazan por dobles de prueba.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'clave-de-prueba';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../src/infraestructure/database/supabase');
const inventarioRepository = require('../src/infraestructure/repositories/InventarioRepository');
const inventarioService = require('../src/application/services/InventarioService');
const app = require('../src/app');

const FILA_RESUMEN = {
  id: 7, id_producto: 1, nombre: 'Piña segunda', cantidad: 5, precio: 4000, und: 'kg',
  comprometido: 5, total: 10, actualizado_en: '2026-11-09T19:40:00+00:00'
};
const FILA_BASICA = { id: 7, id_producto: 1, nombre: 'Piña segunda', cantidad: 5, precio: 4000, und: 'kg' };

const originales = {
  getClaims: supabase.auth.getClaims,
  listarResumen: inventarioRepository.listarResumen,
  listar: inventarioRepository.listar
};

let servidor;
let base;

before(async () => {
  supabase.auth.getClaims = async token => ({
    data: { claims: { sub: `usuario-${token}`, role: 'authenticated', email: token === 'admin' ? 'admin@gmail.com' : 'cliente@prueba.co' } },
    error: null
  });
  await new Promise(resolve => { servidor = app.listen(0, resolve); });
  base = `http://127.0.0.1:${servidor.address().port}/api/inventario`;
});

after(() => {
  Object.assign(supabase.auth, { getClaims: originales.getClaims });
  inventarioRepository.listarResumen = originales.listarResumen;
  inventarioRepository.listar = originales.listar;
  servidor.close();
});

beforeEach(() => {
  inventarioRepository.listarResumen = async () => [FILA_RESUMEN];
  inventarioRepository.listar = async () => [FILA_BASICA];
});

const errorSupabase = code => Object.assign(new Error('fallo simulado'), { code, status: 500 });

test('servicio: devuelve el resumen cuando la función SQL existe', async () => {
  const resultado = await inventarioService.listarResumen({});
  assert.deepEqual(resultado, { migracionPendiente: false, productos: [FILA_RESUMEN] });
});

test('servicio: sin la migración responde con el listado básico y campos en null', async () => {
  for (const code of ['PGRST202', '42883']) {
    inventarioRepository.listarResumen = async () => { throw errorSupabase(code); };
    const resultado = await inventarioService.listarResumen({});
    assert.equal(resultado.migracionPendiente, true);
    assert.deepEqual(resultado.productos, [{ ...FILA_BASICA, comprometido: null, total: null, actualizado_en: null }]);
  }
});

test('servicio: otros errores no se ocultan', async () => {
  inventarioRepository.listarResumen = async () => { throw errorSupabase('42501'); };
  await assert.rejects(inventarioService.listarResumen({}), /fallo simulado/);
});

test('GET /resumen sin token responde 401', async () => {
  const respuesta = await fetch(`${base}/resumen`);
  assert.equal(respuesta.status, 401);
});

test('GET /resumen con un cliente responde 403', async () => {
  const respuesta = await fetch(`${base}/resumen`, { headers: { Authorization: 'Bearer cliente' } });
  assert.equal(respuesta.status, 403);
});

test('GET /resumen con el administrador responde 200 con el resumen', async () => {
  const respuesta = await fetch(`${base}/resumen`, { headers: { Authorization: 'Bearer admin' } });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { migracionPendiente: false, productos: [FILA_RESUMEN] });
});

test('GET / (listado que usa la pantalla de pedidos) no cambia', async () => {
  const respuesta = await fetch(`${base}?disponibles=false`, { headers: { Authorization: 'Bearer cliente' } });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), [FILA_BASICA]);
});
