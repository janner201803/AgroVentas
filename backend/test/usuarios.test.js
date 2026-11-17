// Pruebas de HU-21 (gestionar usuarios). No se conectan a Supabase:
// el token, el perfil y el repositorio se reemplazan por dobles de prueba.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'clave-de-prueba';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../src/infraestructure/database/supabase');
const perfilRepository = require('../src/infraestructure/repositories/PerfilRepository');
const app = require('../src/app');

const ID_PROPIETARIO = '11111111-1111-4111-8111-111111111111';
const ID_EMPLEADO = '22222222-2222-4222-8222-222222222222';
const ID_INEXISTENTE = '33333333-3333-4333-8333-333333333333';

const originales = {
  getClaims: supabase.auth.getClaims,
  obtenerPorId: perfilRepository.obtenerPorId,
  listar: perfilRepository.listar,
  actualizar: perfilRepository.actualizar
};

let servidor;
let base;
let actualizaciones;
let perfiles;

before(async () => {
  supabase.auth.getClaims = async token => ({
    data: { claims: { sub: token, role: 'authenticated', email: `${token}@prueba.co` } },
    error: null
  });
  perfilRepository.obtenerPorId = async id => perfiles[id] ?? null;
  perfilRepository.listar = async () => Object.values(perfiles);
  perfilRepository.actualizar = async (id, cambios) => {
    actualizaciones.push({ id, cambios });
    return perfiles[id] ? { ...perfiles[id], ...cambios } : null;
  };
  await new Promise(resolve => { servidor = app.listen(0, resolve); });
  base = `http://127.0.0.1:${servidor.address().port}/api/usuarios`;
});

after(() => {
  Object.assign(perfilRepository, {
    obtenerPorId: originales.obtenerPorId,
    listar: originales.listar,
    actualizar: originales.actualizar
  });
  supabase.auth.getClaims = originales.getClaims;
  servidor.close();
});

beforeEach(() => {
  actualizaciones = [];
  perfiles = {
    [ID_PROPIETARIO]: { id: ID_PROPIETARIO, correo: 'duenio@prueba.co', rol: 'propietario', activo: true },
    [ID_EMPLEADO]: { id: ID_EMPLEADO, correo: 'empleado@prueba.co', rol: 'empleado', activo: true }
  };
});

const cambiar = (id, cuerpo, token = ID_PROPIETARIO) => fetch(`${base}/${id}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo)
});

test('el Propietario lista los usuarios', async () => {
  const respuesta = await fetch(base, { headers: { Authorization: `Bearer ${ID_PROPIETARIO}` } });
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).length, 2);
});

test('el Empleado no puede listar ni modificar usuarios', async () => {
  const lista = await fetch(base, { headers: { Authorization: `Bearer ${ID_EMPLEADO}` } });
  assert.equal(lista.status, 403);
  const cambio = await cambiar(ID_EMPLEADO, { rol: 'propietario' }, ID_EMPLEADO);
  assert.equal(cambio.status, 403);
  assert.equal(actualizaciones.length, 0);
});

test('el Propietario cambia el rol y el estado de otra cuenta', async () => {
  const respuesta = await cambiar(ID_EMPLEADO, { rol: 'cliente', activo: false });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(actualizaciones, [{ id: ID_EMPLEADO, cambios: { rol: 'cliente', activo: false } }]);
  const { usuario } = await respuesta.json();
  assert.equal(usuario.rol, 'cliente');
  assert.equal(usuario.activo, false);
});

test('solo se envían rol y activo aunque lleguen otros campos', async () => {
  const respuesta = await cambiar(ID_EMPLEADO, { rol: 'empleado', correo: 'otro@x.co', id: 'x' });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(actualizaciones[0].cambios, { rol: 'empleado' });
});

test('rechaza roles, estados o identificadores inválidos (400)', async () => {
  for (const [id, cuerpo] of [
    [ID_EMPLEADO, { rol: 'admin' }],
    [ID_EMPLEADO, { activo: 'no' }],
    [ID_EMPLEADO, {}],
    ['no-es-uuid', { rol: 'cliente' }]
  ]) {
    const respuesta = await cambiar(id, cuerpo);
    assert.equal(respuesta.status, 400, JSON.stringify(cuerpo));
  }
  assert.equal(actualizaciones.length, 0);
});

test('el Propietario no puede quitarse su rol ni desactivarse (409)', async () => {
  for (const cuerpo of [{ rol: 'empleado' }, { activo: false }]) {
    const respuesta = await cambiar(ID_PROPIETARIO, cuerpo);
    assert.equal(respuesta.status, 409, JSON.stringify(cuerpo));
  }
  assert.equal(actualizaciones.length, 0);
});

test('una cuenta inexistente responde 404', async () => {
  assert.equal((await cambiar(ID_INEXISTENTE, { rol: 'empleado' })).status, 404);
});
