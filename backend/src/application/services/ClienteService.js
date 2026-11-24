const clienteRepository = require('../../infraestructure/repositories/ClienteRepository');

function errorValidacion(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarDatos(datos, incluirActivo = false) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw errorValidacion('Envía los datos del cliente');
  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
  const telefono = typeof datos.telefono === 'string' ? datos.telefono.trim() : '';
  const direccion = typeof datos.direccion === 'string' ? datos.direccion.trim() : '';
  const observaciones = typeof datos.observaciones === 'string' ? datos.observaciones.trim() : '';

  if (nombre.length < 2 || nombre.length > 120) throw errorValidacion('El nombre debe tener entre 2 y 120 caracteres');
  if (!/^\d{10}$/.test(telefono)) throw errorValidacion('El teléfono debe tener exactamente 10 dígitos');
  if (direccion.length < 2 || direccion.length > 250) throw errorValidacion('La dirección debe tener entre 2 y 250 caracteres');
  if (observaciones.length > 500) throw errorValidacion('Las observaciones no pueden superar 500 caracteres');

  const correo = datos.correo == null ? '' : String(datos.correo).trim().toLowerCase();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw errorValidacion('El correo de la cuenta no es válido');
  if (incluirActivo && datos.activo !== undefined && typeof datos.activo !== 'boolean') {
    throw errorValidacion('El estado del cliente debe ser activo o inactivo');
  }

  return {
    nombre,
    telefono,
    direccion,
    observaciones: observaciones || null,
    correo,
    ...(incluirActivo && datos.activo !== undefined ? { activo: datos.activo } : {})
  };
}

class ClienteService {
  async registrar(datos, client) {
    const valido = validarDatos(datos);
    return clienteRepository.registrar(valido, client);
  }

  async listar(busqueda, incluirInactivos, client) {
    if (typeof busqueda !== 'string' && busqueda != null) throw errorValidacion('La búsqueda no es válida');
    const termino = String(busqueda ?? '').trim();
    if (termino.length > 120) throw errorValidacion('La búsqueda no puede superar 120 caracteres');
    return clienteRepository.listar(termino, incluirInactivos, client);
  }

  async detalle(id, client) {
    const clienteId = Number(id);
    if (!Number.isSafeInteger(clienteId) || clienteId <= 0) throw errorValidacion('El cliente indicado no es válido');
    const cliente = await clienteRepository.detalle(clienteId, client);
    if (!cliente) throw errorValidacion('La ficha comercial no existe', 404);
    return cliente;
  }

  async actualizar(id, datos, client) {
    const clienteId = Number(id);
    if (!Number.isSafeInteger(clienteId) || clienteId <= 0) throw errorValidacion('El cliente indicado no es válido');
    return clienteRepository.actualizar(clienteId, validarDatos(datos, true), client);
  }
}

module.exports = new ClienteService();
