const supabase = require('../database/supabase');

class InventarioRepository {
  async obtenerPorId(id, client = supabase) {
    const { data, error } = await client.from('inventario')
      .select('id,nombre,cantidad,precio').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async listar(client = supabase) {
    const { data, error } = await client.from('inventario')
      .select('id,nombre,cantidad,precio').order('nombre');
    if (error) throw new Error(error.message);
    return data;
  }

  async listarDisponibles(client = supabase) {
    const { data, error } = await client.from('inventario')
      .select('id,nombre,cantidad,precio')
      .gt('cantidad', 0).not('precio', 'is', null).gt('precio', 0)
      .order('nombre');
    if (error) throw new Error(error.message);
    return data;
  }

  async crear(producto, client = supabase) {
    const { data, error } = await client.from('inventario').insert(producto)
      .select('id,nombre,cantidad,precio').single();
    if (error) throw new Error(error.message);
    return data;
  }
}

module.exports = new InventarioRepository();
