const supabase = require('../database/supabase');

// Códigos de PostgREST/Postgres cuando la tabla perfiles aún no existe
// (migración 20261115_roles_perfiles.sql sin aplicar).
const TABLA_NO_INSTALADA = ['PGRST205', '42P01'];

const COLUMNAS_ADMIN = 'id,correo,nombre,celular,rol,activo,creado_en,actualizado_en';

function errorSupabase(error, accion) {
  const instalada = !TABLA_NO_INSTALADA.includes(error.code);
  const fallo = new Error(instalada
    ? error.message || `No fue posible ${accion}`
    : 'Falta instalar la migración 20261115_roles_perfiles.sql en Supabase.');
  fallo.code = error.code;
  fallo.migracionPendiente = !instalada;
  fallo.status = !instalada ? 503
    : error.code === '42501' ? 403
      : ['23514', '22P02', '22023'].includes(error.code) ? 400
        : 500;
  return fallo;
}

class PerfilRepository {
  /**
   * Devuelve { id, rol, activo, nombre } del usuario, o null si no tiene perfil.
   * Lanza un error con `migracionPendiente: true` si la tabla no existe.
   */
  async obtenerPorId(id, client = supabase) {
    const { data, error } = await client
      .from('perfiles')
      .select('id,rol,activo,nombre')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const fallo = new Error(TABLA_NO_INSTALADA.includes(error.code)
        ? 'Falta instalar la migración 20261115_roles_perfiles.sql en Supabase.'
        : error.message || 'No fue posible consultar el perfil');
      fallo.code = error.code;
      fallo.migracionPendiente = TABLA_NO_INSTALADA.includes(error.code);
      fallo.status = fallo.migracionPendiente ? 503 : 500;
      throw fallo;
    }

    return data;
  }

  /** HU-21: todas las cuentas (la RLS solo las muestra al Propietario). */
  async listar(client = supabase) {
    const { data, error } = await client
      .from('perfiles')
      .select(COLUMNAS_ADMIN)
      .order('correo', { ascending: true });

    if (error) throw errorSupabase(error, 'consultar los usuarios');
    return data;
  }

  /** HU-21: cambia rol y/o estado. Devuelve null si la cuenta no existe o no es visible. */
  async actualizar(id, cambios, client = supabase) {
    const { data, error } = await client
      .from('perfiles')
      .update(cambios)
      .eq('id', id)
      .select(COLUMNAS_ADMIN)
      .maybeSingle();

    if (error) throw errorSupabase(error, 'actualizar el usuario');
    return data;
  }
}

module.exports = new PerfilRepository();
