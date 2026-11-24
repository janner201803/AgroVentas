const supabase = require('../database/supabase');

class ReportesRepository {
  async resumen(desde, hasta, client = supabase) {
    const { data, error } = await client.rpc('reportes_resumen_propietario', {
      p_desde: desde,
      p_hasta: hasta
    });
    if (error) {
      const noInstalada = ['PGRST202', '42883'].includes(error.code);
      const fallo = new Error(noInstalada
        ? 'Falta instalar la migración 20261129_hu19_20_reportes_tablero.sql en Supabase.'
        : error.message || 'No fue posible consultar los reportes');
      fallo.code = error.code;
      fallo.status = noInstalada ? 503 : error.code === '42501' ? 403
        : ['22023', '22007', '22P02'].includes(error.code) ? 400 : 500;
      throw fallo;
    }
    return data;
  }
}

module.exports = new ReportesRepository();
