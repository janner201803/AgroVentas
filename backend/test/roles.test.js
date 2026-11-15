// Pruebas de HU-01 (permisos por rol). No se conectan a Supabase:
// el token y el perfil se reemplazan por dobles de prueba.
// El "token" de prueba es el id del usuario; su perfil sale de PERFILES.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'clave-de-prueba';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const supabase = require('../src/infraestructure/database/supabase');
const perfilRepository = require('../src/infraestructure/repositories/PerfilRepository');
const inventarioRepository = require('../src/infraestructure/repositories/InventarioRepository');
const pedidoRepository = require('../src/infraestructure/repositories/PedidoRepository');
const verificarRol = require('../src/presentation/middleware/verificarRol');
const app = require('../src/app');

const PERFILES = {
  propietario: { rol: 'propietario', activo: true },
  empleado: { rol: 'empleado', activo: true },
  cliente: { rol: 'cliente', activo: true },
  inactivo: { rol: 'empleado', activo: false },
  // Correo del antiguo administrador, pero con rol de cliente: el correo ya no da permisos.
  'admin-correo': { rol: 'cliente', activo: true }
};

const originales = {
  getClaims: supabase.auth.getClaims,
  obtenerPerfil: perfilRepository.obtenerPorId,
  listarResumen: inventarioRepository.listarResumen,
  listar: inventarioRepository.listar,
  listarPorUsuario: pedidoRepository.listarPorUsuario
};

let servidor;
let base;
let migracionPendiente;

before(async () => {
  supabase.auth.getClaims = async token => ({
    data: {
      claims: {
        sub: token,
        role: 'authenticated',
        email: token === 'admin-correo' ? 'admin@gmail.com' : `${token}@prueba.co`
      }
    },
    error: null
  });
  perfilRepository.obtenerPorId = async id => {
    if (migracionPendiente) {
      throw Object.assign(new Error('Falta instalar la migración'), { migracionPendiente: true, status: 503 });
    }
    return PERFILES[id] ? { id, nombre: null, ...PERFILES[id] } : null;
  };
  inventarioRepository.listarResumen = async () => [];
  inventarioRepository.listar = async () => [];
  pedidoRepository.listarPorUsuario = async () => [];
  await new Promise(resolve => { servidor = app.listen(0, resolve); });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  supabase.auth.getClaims = originales.getClaims;
  perfilRepository.obtenerPorId = originales.obtenerPerfil;
  inventarioRepository.listarResumen = originales.listarResumen;
  inventarioRepository.listar = originales.listar;
  pedidoRepository.listarPorUsuario = originales.listarPorUsuario;
  servidor.close();
});

beforeEach(() => { migracionPendiente = false; });

const pedir = (ruta, token) => fetch(`${base}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });

test('Propietario y Empleado acceden al resumen de inventario (HU-18)', async () => {
  for (const token of ['propietario', 'empleado']) {
    assert.equal((await pedir('/inventario/resumen', token)).status, 200, token);
  }
});

test('el Cliente no accede al resumen de inventario (403)', async () => {
  const respuesta = await pedir('/inventario/resumen', 'cliente');
  assert.equal(respuesta.status, 403);
  assert.match((await respuesta.json()).mensaje, /Propietario o el Empleado/);
});

test('solo el Propietario accede a la gestión de usuarios (HU-21)', async () => {
  for (const token of ['empleado', 'cliente']) {
    assert.equal((await pedir('/usuarios', token)).status, 403, token);
  }
});

test('el correo admin@gmail.com ya no da permisos por sí solo', async () => {
  assert.equal((await pedir('/inventario/resumen', 'admin-correo')).status, 403);
});

test('una cuenta sin perfil no tiene permisos de personal', async () => {
  assert.equal((await pedir('/inventario/resumen', 'sin-perfil')).status, 403);
});

test('una cuenta desactivada no accede a ninguna ruta protegida', async () => {
  for (const ruta of ['/pedidos', '/inventario', '/inventario/resumen']) {
    const respuesta = await pedir(ruta, 'inactivo');
    assert.equal(respuesta.status, 403, ruta);
    assert.equal((await respuesta.json()).codigo, 'cuenta_desactivada');
  }
});

test('sin la migración de roles, las rutas de clientes siguen funcionando', async () => {
  migracionPendiente = true;
  assert.equal((await pedir('/pedidos', 'cliente')).status, 200);
  assert.equal((await pedir('/inventario', 'cliente')).status, 200);
});

test('sin la migración de roles, las rutas por rol responden 503', async () => {
  migracionPendiente = true;
  assert.equal((await pedir('/inventario/resumen', 'propietario')).status, 503);
});

test('verificarRol rechaza roles inexistentes al configurarse', () => {
  assert.throws(() => verificarRol('admin'), /roles no válidos/);
  assert.throws(() => verificarRol(), /roles no válidos/);
});
