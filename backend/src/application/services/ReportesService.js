const reportesRepository = require('../../infraestructure/repositories/ReportesRepository');

function errorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
}

function hoyColombia() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.filter(parte => parte.type !== 'literal').map(parte => [parte.type, parte.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const parsed = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
}

class ReportesService {
  async resumen(desde, hasta, client) {
    const hoy = hoyColombia();
    const inicioMes = `${hoy.slice(0, 7)}-01`;
    const fechaDesde = desde || inicioMes;
    const fechaHasta = hasta || hoy;
    if (!fechaValida(fechaDesde) || !fechaValida(fechaHasta)) {
      throw errorValidacion('Usa fechas válidas con formato AAAA-MM-DD');
    }
    if (fechaDesde > fechaHasta) throw errorValidacion('La fecha inicial no puede ser posterior a la fecha final');
    if (fechaHasta > hoy) throw errorValidacion('La fecha final no puede estar en el futuro');
    return reportesRepository.resumen(fechaDesde, fechaHasta, client);
  }
}

module.exports = new ReportesService();
