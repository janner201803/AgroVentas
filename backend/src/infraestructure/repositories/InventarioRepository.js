const supabase = require('../database/supabase');

const SELECT_INVENTARIO = 'id,id_producto,cantidad,producto:productos(id,nombre,unidad,precio)';

function unidadAplicacion(unidad) {
  const valor = String(unidad || '').trim().toLowerCase();
  if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(valor)) return 'kg';
  if (['und', 'unidad', 'unidades'].includes(valor)) return 'und';
  return valor;
}

function convertirFila(fila) {
  return {
    id: fila.id,
    id_producto: fila.id_producto,
    nombre: fila.producto?.nombre,
    cantidad: Number(fila.cantidad),
    precio: Number(fila.producto?.precio),
    und: unidadAplicacion(fila.producto?.unidad)
  };
}

function convertirError(error, signal, accion) {
  let mensaje = error.message;
  if (signal?.aborted) {
    mensaje = `Supabase tardó demasiado en ${accion}.`;
  } else if (error.code === 'PGRST202' && accion === 'guardar las existencias') {
    mensaje = 'No está instalada la función de inventario en Supabase. Ejecuta la migración 20261101_catalogo_productos_inventario_acumulable.sql.';
  } else if (error.code === '42P10' && accion === 'guardar las existencias') {
    mensaje = 'Falta el índice único de inventario por producto. Ejecuta la migración 20261101_catalogo_productos_inventario_acumulable.sql.';
  }
  const fallo = new Error(mensaje);
  fallo.status = signal?.aborted ? 504
    : error.code === '42501' ? 403
      : error.code === '22023' ? 400
        : error.code === 'P0002' ? 404
          : 500;
  fallo.code = error.code;
  return fallo;
}

class InventarioRepository {
  async obtenerPorId(idInventario, client = supabase) {
    const { data, error } = await client.from('inventario')
      .select(SELECT_INVENTARIO)
      .eq('id', idInventario)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? convertirFila(data) : null;
  }

  async listar(client = supabase) {
    const signal = AbortSignal.timeout(12_000);
    const { data, error } = await client.from('inventario')
      .select(SELECT_INVENTARIO)
      .order('id_producto')
      .abortSignal(signal);
    if (error) throw convertirError(error, signal, 'consultar el inventario');
    return data.map(convertirFila);
  }

  async listarDisponibles(client = supabase) {
    const signal = AbortSignal.timeout(12_000);
    const { data, error } = await client.from('inventario')
      .select(SELECT_INVENTARIO)
      .gt('cantidad', 0)
      .order('id_producto')
      .abortSignal(signal);
    if (error) throw convertirError(error, signal, 'consultar los productos disponibles');

    // pedidos.id_producto tiene una FK a inventario.id en el esquema actual.
    return data
      .map(convertirFila)
      .filter(producto => producto.precio > 0);
  }

  async agregarExistencias(datos, client = supabase) {
    const signal = AbortSignal.timeout(12_000);
    const { data, error } = await client.rpc('agregar_existencias', {
      p_id_producto: datos.id_producto,
      p_cantidad: datos.cantidad
    }).abortSignal(signal);
    if (error) throw convertirError(error, signal, 'guardar las existencias');
    return data;
  }
}

module.exports = new InventarioRepository();
