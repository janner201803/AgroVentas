const supabase = require('../database/supabase');

function errorSupabase(error, accion) {
  const fallo = new Error(error.message || `No fue posible ${accion}`);
  fallo.code = error.code;
  fallo.details = error.details;
  fallo.hint = error.hint;
  fallo.status = error.code === '42501' ? 403
    : ['23505', 'P0001'].includes(error.code) ? 409
      : error.code === 'P0002' ? 404
      : ['23502', '23503', '23514', '22P02', '22023'].includes(error.code) ? 400
        : 500;
  return fallo;
}

class PedidoRepository {
  async horariosOcupados(fecha, client = supabase) {
    const { data, error } = await client.rpc('horarios_ocupados', { p_fecha: fecha });
    if (error) {
      if (['PGRST202', '42883', '42501'].includes(error.code)) {
        const setupError = new Error('Falta habilitar la consulta de horarios en Supabase. Ejecuta la migración indicada en backend/supabase/SETUP.md.');
        setupError.status = 503;
        throw setupError;
      }
      throw errorSupabase(error, 'consultar los horarios');
    }
    return data.map(pedido => String(pedido.hora_entrega).slice(0, 5));
  }

  async crearConReserva(pedido, client = supabase) {
    const { data, error } = await client.rpc('crear_pedido_con_reserva', {
      p_id_pedido: pedido.id,
      p_id_producto: pedido.id_producto,
      p_cantidad: pedido.cantidad,
      p_fecha_entrega: pedido.fecha_entrega,
      p_hora_entrega: pedido.hora_entrega,
      p_metodo_pago: pedido.metodo_pago
    });

    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') {
        const setupError = new Error('Falta instalar la migración 20261102_reserva_stock_pedidos.sql en Supabase.');
        setupError.status = 503;
        throw setupError;
      }
      const fallo = errorSupabase(error, 'crear el pedido');
      if (error.code === '23505') {
        fallo.message = 'Ese horario acaba de ser ocupado. Selecciona otro.';
      } else if (error.code === 'P0001') {
        fallo.message = error.message || 'El inventario disponible cambió. Revisa la cantidad e inténtalo de nuevo.';
      }
      throw fallo;
    }

    return data;
  }

  async listarPorUsuario(idUsuario, client = supabase) {
    const { data, error } = await client
      .from('pedidos')
      .select('*')
      .eq('id_usuario', idUsuario)
      .order('fecha_entrega', { ascending: false })
      .order('hora_entrega', { ascending: false });

    if (error) {
      throw errorSupabase(error, 'consultar los pedidos');
    }

    if (data.length === 0) return data;

    const idsInventario = [...new Set(data.map(pedido => pedido.id_producto))];
    const { data: inventario, error: errorInventario } = await client
      .from('inventario')
      .select('id,producto:productos(nombre,unidad)')
      .in('id', idsInventario);

    if (errorInventario) {
      throw errorSupabase(errorInventario, 'consultar los productos de los pedidos');
    }

    const productosPorId = new Map(
      inventario.map(fila => [
        String(fila.id),
        {
          nombre: fila.producto?.nombre ?? null,
          unidad: fila.producto?.unidad ?? null
        }
      ])
    );

    return data.map(pedido => ({
      ...pedido,
      producto_nombre: productosPorId.get(String(pedido.id_producto))?.nombre ?? null,
      producto_unidad: productosPorId.get(String(pedido.id_producto))?.unidad ?? null
    }));
  }
}

module.exports = new PedidoRepository();
