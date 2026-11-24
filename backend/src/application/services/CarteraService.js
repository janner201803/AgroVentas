const carteraRepository = require('../../infraestructure/repositories/CarteraRepository');

const ESTADOS = ['pendiente', 'parcial', 'pagada'];
const METODOS_PAGO = ['efectivo', 'transferencia'];

function errorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
}

class CarteraService {
  async listar(estado, client) {
    if (estado && !ESTADOS.includes(estado)) throw errorValidacion('El filtro de estado no es válido');
    return carteraRepository.listar(estado, client);
  }

  async registrarAbono(id, datos, client) {
    const cuentaId = Number(id);
    if (!Number.isSafeInteger(cuentaId) || cuentaId <= 0) throw errorValidacion('La cuenta indicada no es válida');
    const valor = Number(datos?.valor);
    if (!Number.isFinite(valor) || valor <= 0 || Math.round(valor * 100) !== valor * 100) {
      throw errorValidacion('Ingresa un valor de abono mayor que cero, con máximo dos decimales');
    }
    if (!METODOS_PAGO.includes(datos?.metodo_pago)) throw errorValidacion('Selecciona efectivo o transferencia');
    if (datos?.nota != null && typeof datos.nota !== 'string') throw errorValidacion('La nota debe ser texto');
    const nota = typeof datos?.nota === 'string' ? datos.nota.trim() : '';
    if (nota.length > 500) throw errorValidacion('La nota no puede superar 500 caracteres');
    return carteraRepository.registrarAbono(cuentaId, { valor, metodo_pago: datos.metodo_pago, nota: nota || null }, client);
  }
}

module.exports = new CarteraService();
