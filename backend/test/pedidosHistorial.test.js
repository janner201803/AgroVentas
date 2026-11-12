// Pruebas de HU-08 (consultar estado de pedidos). No se conectan a Supabase:
// la verificación del token y las consultas se reemplazan por dobles de prueba.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'clave-de-prueba';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../src/infraestructure/database/supabase');
const pedidoRepository = require('../src/infraestructure/repositories/PedidoRepository');
const app = require('../src/app');

const originales = {
  getClaims: supabase.auth.getClaims,
  listarPorUsuario: pedidoRepository.listarPorUsuario
};

let servidor;
let base;
let consultadoPara;

before(async () => {
  // El "token" de prueba es el id del usuario: "ana" o "luis".
  supabase.auth.getClaims = async token => ({
    data: { claims: { sub: `usuario-${token}`, role: 'authenticated', email: `${token}@prueba.co` } },
    error: null
  });
  await new Promise(resolve => { servidor = app.listen(0, resolve); });
  base = `http://127.0.0.1:${servidor.address().port}/api/pedidos`;
});

after(() => {
  supabase.auth.getClaims = originales.getClaims;
  pedidoRepository.listarPorUsuario = originales.listarPorUsuario;
  servidor.close();
});

beforeEach(() => {
  consultadoPara = null;
  pedidoRepository.listarPorUsuario = async idUsuario => {
    consultadoPara = idUsuario;
    return [{ id: 'p1', id_usuario: idUsuario, estado: 'pendiente' }];
  };
});

const pedir = (ruta, token) => fetch(`${base}${ruta}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});

test('GET /api/pedidos sin sesión responde 401 y no consulta nada', async () => {
  const respuesta = await pedir('');
  assert.equal(respuesta.status, 401);
  assert.equal(consultadoPara, null);
});

test('cada usuario consulta solo sus pedidos (el id sale del token)', async () => {
  await pedir('', 'ana');
  assert.equal(consultadoPara, 'usuario-ana');
  await pedir('', 'luis');
  assert.equal(consultadoPara, 'usuario-luis');
});

test('no se puede pedir el historial de otro usuario por la URL', async () => {
  const respuesta = await pedir('?id_usuario=usuario-luis', 'ana');
  assert.equal(respuesta.status, 200);
  assert.equal(consultadoPara, 'usuario-ana');
  const pedidos = await respuesta.json();
  assert.ok(pedidos.every(p => p.id_usuario === 'usuario-ana'));
});

test('un usuario sin pedidos recibe una lista vacía con estado 200', async () => {
  pedidoRepository.listarPorUsuario = async () => [];
  const respuesta = await pedir('', 'ana');
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), []);
});

test('un error de la base no se presenta como historial vacío', async () => {
  pedidoRepository.listarPorUsuario = async () => {
    throw Object.assign(new Error('relation "pedidos" does not exist'), { code: '42P01', status: 500 });
  };
  const respuesta = await pedir('', 'ana');
  assert.equal(respuesta.status, 500);
  const cuerpo = await respuesta.json();
  assert.equal(cuerpo.mensaje, 'No fue posible consultar tus pedidos. Intenta de nuevo en un momento.');
  assert.equal(cuerpo.codigo, '42P01');
  assert.ok(!Array.isArray(cuerpo));
});

test('un permiso negado por la base conserva el 403', async () => {
  pedidoRepository.listarPorUsuario = async () => {
    throw Object.assign(new Error('permission denied for table pedidos'), { code: '42501', status: 403 });
  };
  const respuesta = await pedir('', 'ana');
  assert.equal(respuesta.status, 403);
});

test('el repositorio filtra por el usuario y ordena por entrega más reciente', async () => {
  pedidoRepository.listarPorUsuario = originales.listarPorUsuario;
  const llamadas = [];
  const consulta = {
    select(...a) { llamadas.push(['select', ...a]); return this; },
    eq(...a) { llamadas.push(['eq', ...a]); return this; },
    order(...a) { llamadas.push(['order', ...a]); return this; },
    in(...a) { llamadas.push(['in', ...a]); return this; },
    then(resolver) {
      const esInventario = llamadas.some(l => l[0] === 'in');
      return resolver(esInventario
        ? { data: [{ id: 3, producto: { nombre: 'Piña segunda', unidad: 'kg' } }], error: null }
        : { data: [{ id: 'p1', id_producto: 3, id_usuario: 'usuario-ana' }], error: null });
    }
  };
  const cliente = { from: () => consulta };

  const pedidos = await pedidoRepository.listarPorUsuario('usuario-ana', cliente);

  assert.deepEqual(llamadas.find(l => l[0] === 'eq'), ['eq', 'id_usuario', 'usuario-ana']);
  assert.deepEqual(llamadas.filter(l => l[0] === 'order'), [
    ['order', 'fecha_entrega', { ascending: false }],
    ['order', 'hora_entrega', { ascending: false }]
  ]);
  assert.equal(pedidos[0].producto_nombre, 'Piña segunda');
  assert.equal(pedidos[0].producto_unidad, 'kg');
});
