# Catálogo de productos e inventario

El esquema de la aplicación separa el catálogo de los saldos:

- `public.productos`: `id`, `nombre`, `unidad`, `precio`. Contiene una fila por producto que se vende.
- `public.inventario`: `id`, `id_producto`, `cantidad`. Contiene como máximo una fila por producto.
- `public.inventario.id_producto` apunta al identificador de `public.productos`.
- En el esquema actual, `public.pedidos.id_producto` apunta a `public.inventario.id` (la clave foránea existente confirma esta relación).

## Aplicar en Supabase

1. Si aún no ejecutaste la migración anterior de horarios, ejecuta primero `migrations/20261020_pedidos_fecha_hora_inventario.sql`.
2. Ejecuta `migrations/20261101_catalogo_productos_inventario_acumulable.sql` en el SQL Editor. Esta migración consolida filas de inventario duplicadas sumando sus cantidades. Se detiene si hay filas sin `id_producto`; en ese caso, asígnales primero un producto del catálogo.
3. Ejecuta `migrations/20261102_reserva_stock_pedidos.sql` después de las migraciones anteriores. Los pedidos nuevos reservan y descuentan el stock junto con su registro; al cancelar o rechazar un pedido, la reserva se devuelve. La migración no descuenta pedidos existentes, que deben revisarse manualmente si siguen pendientes.
4. En **Table Editor → public.productos**, registra los productos y su unidad (`kg` o `und`). El nombre ya no se escribe al ingresar existencias; el formulario lo carga del catálogo.
5. Reinicia el backend y el frontend.

La migración configura RLS solamente para el catálogo `productos`: los usuarios autenticados pueden consultarlo y solo `admin@gmail.com` puede modificarlo. No modifica las políticas RLS de `inventario`. El backend usa `GET /api/productos` para cargar el selector y `POST /api/inventario` para agregar existencias. La función SQL `agregar_existencias` realiza la suma atómicamente: volver a elegir el mismo producto aumenta la cantidad de la fila existente. El precio y la unidad se consultan desde `productos`.

La vista de pedidos obtiene existencias disponibles desde `GET /api/inventario?disponibles=true`. Usa `inventario.id` como `id` para el formulario y lo envía como `pedidos.id_producto`; el backend lee `inventario.id_producto` para obtener el producto del catálogo, el precio y la unidad.

La creación del pedido usa la función `crear_pedido_con_reserva` para descontar existencias y registrar el pedido en una misma transacción. La función comprueba el stock y el horario reservado incluso si dos solicitudes llegan a la vez. La tabla interna `reservas_stock_pedidos` conserva la cantidad que se debe devolver si el estado cambia a `cancelado` o `rechazado`; si un pedido cancelado vuelve a un estado activo, la cantidad se reserva otra vez y la transición falla si ya no hay stock suficiente.
