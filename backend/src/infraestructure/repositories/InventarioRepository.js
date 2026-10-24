const supabase = require('../database/supabase');

class InventarioRepository {
  async obtenerPorId(id, client = supabase) {
    const { data, error } = await client.from('inventario')
      .select('id,nombre,cantidad,precio,und').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async listar(client = supabase) {
    const signal = AbortSignal.timeout(12_000);
    const { data, error } = await client.from('inventario')
      .select('id,nombre,cantidad,precio,und').order('nombre').abortSignal(signal);
    if (error) {
      const fallo = new Error(signal.aborted ? 'La consulta a Supabase excedió el tiempo de espera' : error.message);
      fallo.status = signal.aborted ? 504 : (error.code === '42501' ? 403 : 500);
      fallo.code = error.code;
      throw fallo;
    }
    return data;
  }

  async listarDisponibles(client = supabase) {
    const signal = AbortSignal.timeout(12_000);
    const { data, error } = await client.from('inventario')
      .select('id,nombre,cantidad,precio,und')
      .gt('cantidad', 0).not('precio', 'is', null).gt('precio', 0)
      .order('nombre').abortSignal(signal);
    if (error) {
      const fallo = new Error(signal.aborted ? 'La consulta a Supabase excedió el tiempo de espera' : error.message);
      fallo.status = signal.aborted ? 504 : (error.code === '42501' ? 403 : 500);
      fallo.code = error.code;
      throw fallo;
    }
    return data;
  }

  async crear(producto, client = supabase) {
    const signal = AbortSignal.timeout(12_000);
    const { data, error } = await client.from('inventario').insert(producto)
      .select('id,nombre,cantidad,precio,und').single().abortSignal(signal);
    if (error) {
      const fallo = new Error(signal.aborted
        ? 'Supabase tardó demasiado en guardar el producto. Actualiza el inventario antes de volver a intentar.'
        : error.code === '42501'
          ? 'Supabase rechazó el guardado por permisos RLS. Revisa las políticas INSERT y SELECT de inventario para authenticated.'
          : error.message);
      fallo.status = signal.aborted ? 504 : (error.code === '42501' ? 403 : 500);
      fallo.code = error.code;
      throw fallo;
    }
    return data;
  }
}

module.exports = new InventarioRepository();
