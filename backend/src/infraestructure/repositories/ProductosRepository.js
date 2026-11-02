const supabase = require('../database/supabase');

class ProductosRepository {
  async listar(client = supabase) {
    const signal = AbortSignal.timeout(12_000);
    const { data, error } = await client.from('productos')
      .select('id,nombre,unidad,precio')
      .order('nombre')
      .abortSignal(signal);

    if (error) {
      const fallo = new Error(signal.aborted
        ? 'Supabase tardó demasiado en consultar el catálogo de productos.'
        : error.message);
      fallo.status = signal.aborted ? 504 : (error.code === '42501' ? 403 : 500);
      fallo.code = error.code;
      throw fallo;
    }

    return data.map(producto => ({
      id: producto.id,
      nombre: producto.nombre,
      unidad: producto.unidad,
      precio: Number(producto.precio)
    }));
  }

  async obtenerPorId(id, client = supabase) {
    const { data, error } = await client.from('productos')
      .select('id,nombre,unidad,precio')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
}

module.exports = new ProductosRepository();
