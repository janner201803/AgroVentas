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
4. (HU-18, pendiente de revisión de liderazgo técnico y autorización del responsable de datos) Ejecuta `migrations/20261109_inventario_actualizacion_comprometido.sql`. Agrega `inventario.actualizado_en` con un trigger que la actualiza en cada cambio de cantidad, y la función `inventario_resumen()` (solo administrador) con disponible, comprometido y total por producto. Es aditiva: no borra ni modifica datos; las filas existentes quedan con fecha vacía hasta su próximo cambio.
5. (HU-01 / HU-21, pendiente de revisión de liderazgo técnico y autorización del responsable de datos) Ejecuta `migrations/20261115_roles_perfiles.sql`. Crea `public.perfiles` (`rol`: `propietario`, `empleado` o `cliente`; `activo`; `correo`; `nombre`; `celular`), un trigger que crea el perfil de Cliente al registrarse (y mantiene el correo al día) y un perfil para cada cuenta existente. `admin@gmail.com` queda como Propietario. Desde ese momento `es_administrador()` significa "Propietario activo" y ya no depende del correo; `es_personal()` significa "Propietario o Empleado activo". El Propietario asigna roles y activa o desactiva cuentas desde la pantalla **Usuarios** (`/usuarios`); un empleado nuevo se registra como cualquier cliente y luego se le cambia el rol. Un Propietario no puede quitarse su rol ni desactivarse.
6. (HU-17 / HU-18, requiere los pasos 4 y 5) Ejecuta `migrations/20261116_inventario_empleado.sql`. Permite que el Empleado consulte el resumen del inventario y registre entradas (`agregar_existencias` e `inventario_resumen` pasan a usar `es_personal()`). El catálogo de productos y sus precios siguen siendo solo del Propietario.
7. (HU-12 / HU-13, requiere el paso 5) Ejecuta `migrations/20261119_estados_historial_pedidos.sql`. Deja los pedidos con cuatro estados (`pendiente`, `en_preparacion`, `entregado`, `cancelado`; convierte `confirmado`/`preparado` en `en_preparacion` y `rechazado` en `cancelado`, y se detiene si encuentra otro valor). Crea `pedidos_historial_estados`, que los triggers llenan con fecha, responsable y nota en cada creación o cambio de estado; los pedidos anteriores quedan sin historial. Al pasar a `entregado` se libera la reserva de stock sin devolverla al inventario. Agrega las funciones `cambiar_estado_pedido` (valida la transición; solo personal), `pedidos_personal` (lista con cliente y producto; solo personal) e `historial_estados_pedido` (personal o dueño del pedido). La pantalla es **Gestión de pedidos** (`/gestion-pedidos`).
8. En **Table Editor → public.productos**, registra los productos y su unidad (`kg` o `und`). El nombre ya no se escribe al ingresar existencias; el formulario lo carga del catálogo.
9. Reinicia el backend y el frontend.

La migración configura RLS solamente para el catálogo `productos`: los usuarios autenticados pueden consultarlo y solo el Propietario (`es_administrador()`) puede modificarlo. No modifica las políticas RLS de `inventario`. El backend usa `GET /api/productos` para cargar el selector y `POST /api/inventario` para agregar existencias. La función SQL `agregar_existencias` realiza la suma atómicamente: volver a elegir el mismo producto aumenta la cantidad de la fila existente. El precio y la unidad se consultan desde `productos`.

La pantalla de inventario usa `GET /api/inventario/resumen` (solo administrador). Si la función `inventario_resumen` todavía no existe, el backend responde con el listado básico y `migracionPendiente: true`, y la pantalla avisa en lugar de fallar. `inventario.cantidad` es el disponible (ya descontado por los pedidos); el comprometido sale de `reservas_stock_pedidos` y no incluye pedidos anteriores a la migración del 2 de noviembre.

La vista de pedidos obtiene existencias disponibles desde `GET /api/inventario?disponibles=true`. Usa `inventario.id` como `id` para el formulario y lo envía como `pedidos.id_producto`; el backend lee `inventario.id_producto` para obtener el producto del catálogo, el precio y la unidad.

La creación del pedido usa la función `crear_pedido_con_reserva` para descontar existencias y registrar el pedido en una misma transacción. La función comprueba el stock y el horario reservado incluso si dos solicitudes llegan a la vez. La tabla interna `reservas_stock_pedidos` conserva la cantidad que se debe devolver si el estado cambia a `cancelado` o `rechazado`; si un pedido cancelado vuelve a un estado activo, la cantidad se reserva otra vez y la transición falla si ya no hay stock suficiente.

## Carrito de varios productos

Después de la migración de estados del 19 de noviembre, aplicar una vez `migrations/20261121_carrito.sql` en el entorno de prueba y actualizar la API y el frontend. El cliente envía una lista de productos y cantidades para un único horario. La base calcula los precios, guarda las líneas y reserva todas las cantidades dentro de la misma transacción. Los pedidos históricos siguen mostrando su producto original.

Para comprobar el flujo, agregar dos variedades con stock, confirmar el pedido y abrir el mismo identificador en Mis pedidos y Gestión de pedidos. Cancelarlo debe devolver ambas reservas. En otra compra, reducir el stock del segundo producto antes de confirmar y comprobar que el rechazo conserva el saldo del primero.
