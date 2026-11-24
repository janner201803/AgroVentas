const supabase = require('../database/supabase');

function errorSupabase(error, accion) {
  const noInstalada = ['PGRST202', '42883'].includes(error.code);
  const fallo = new Error(noInstalada
    ? 'Falta instalar la migración 20261125_hu16_cartera_abonos.sql en Supabase.'
    : error.message || `No fue posible ${accion}`);
  fallo.code = error.code;
  fallo.details = error.details;
  fallo.status = noInstalada ? 503
    : error.code === '42501' ? 403
      : error.code === 'P0002' ? 404
        : ['22023', '22P02', '23514'].includes(error.code) ? 400
          : 500;
  throw fallo;
}

class CarteraRepository {
  async listar(estado, client = supabase) {
    const { data, error } = await client.rpc('cartera_personal', { p_estado: estado || null });
    if (error) errorSupabase(error, 'consultar la cartera');
    return data ?? [];
  }

  async registrarAbono(cuentaId, datos, client = supabase) {
    const { data, error } = await client.rpc('registrar_abono_cuenta', {
      p_cuenta_id: cuentaId,
      p_valor: datos.valor,
      p_metodo_pago: datos.metodo_pago,
      p_nota: datos.nota
    });
    if (error) errorSupabase(error, 'registrar el abono');
    return data;
  }

  async listarMisCompras(client = supabase) {
    const { data, error } = await client.rpc('mis_compras_cliente');
    if (error) {
      const noInstalada = ['PGRST202', '42883'].includes(error.code);
      const fallo = new Error(noInstalada
        ? 'Falta instalar la migración 20261126_hu09_compras_cliente.sql en Supabase.'
        : error.message || 'No fue posible consultar tus compras');
      fallo.code = error.code;
      fallo.status = noInstalada ? 503 : error.code === '42501' ? 403 : 500;
      throw fallo;
    }
    return data ?? [];
  }
}

module.exports = new CarteraRepository();
