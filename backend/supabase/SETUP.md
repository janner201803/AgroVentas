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

## HU-15 · Generar cuentas por cobrar

Después de aplicar `migrations/20261122_clientes_ventas.sql`, ejecuta `migrations/20261123_hu15_cuentas_por_cobrar.sql` en Supabase. Cada nueva venta con `metodo_pago = 'credito'` genera, dentro de la misma transacción, una sola fila en `public.cuentas_por_cobrar` vinculada a la venta y su ficha de cliente. La cuenta inicia con `valor_original` y `saldo_pendiente` iguales al total de la venta, `fecha_emision` igual a la fecha de registro de la venta y estado `pendiente`. También se incorporan idempotentemente las ventas a crédito ya existentes.

`fecha_vencimiento` queda vacía hasta que el negocio defina el plazo de pago. La tabla no otorga acceso directo por RLS; las consultas de cartera y del cliente se implementarán con sus permisos en las siguientes partes. Esta primera parte no registra abonos ni cambia la interfaz.

**Relación con usuarios:** `perfiles` es el perfil de la cuenta de autenticación (`id` UUID, rol y correo). `clientes` es la ficha comercial (`id` bigint, nombre, teléfono y dirección) y `clientes.cuenta_id` la vincula opcionalmente a la cuenta del cliente. Ventas y cuentas por cobrar usan `cliente_id` hacia `clientes.id`, porque una ficha comercial puede existir aunque el cliente aún no tenga usuario. Para mostrar la deuda a un cliente con cuenta, las consultas deben unir `cuentas_por_cobrar.cliente_id → clientes.id → clientes.cuenta_id → perfiles.id` y filtrar por `auth.uid()`.

## HU-16 · Consultar cartera y registrar abonos

Después de la migración de cuentas por cobrar, ejecuta `migrations/20261125_hu16_cartera_abonos.sql`. Crea `public.abonos_cuenta` y las funciones `cartera_personal` y `registrar_abono_cuenta`. El backend expone `GET /api/cartera` (filtro opcional `?estado=pendiente|parcial|pagada`) y `POST /api/cartera/:id/abonos`; ambas rutas requieren una sesión activa de Propietario o Empleado. El abono y el recálculo del saldo/estado ocurren en una única transacción y se rechazan pagos mayores al saldo.

La pantalla está en `/cartera` y se enlaza desde Inicio. Muestra ventas a crédito, saldo, estado, vencimiento si fue definido e historial de pagos. Los pagos registrados son abonos reales; no se generan cuotas programadas porque todavía no se ha definido una frecuencia/plazo comercial.

## HU-09 · Historial de compras y saldo del cliente

Después de instalar las migraciones de cuentas por cobrar y abonos, ejecuta `migrations/20261126_hu09_compras_cliente.sql`. Crea `mis_compras_cliente()`, que filtra las ventas por `pedidos.id_usuario = auth.uid()` y devuelve productos, fecha de entrega, método de pago, saldo y abonos asociados. El backend ofrece `GET /api/cartera/mis-compras` solo a cuentas con rol Cliente; no acepta identificadores de cliente desde el navegador. En el frontend está en Inicio → **Mis compras y pagos** (`/mis-compras`).

## HU-03 / HU-04 · Consultar, editar y desactivar clientes

Después de las migraciones de clientes, ventas y cartera, ejecuta `migrations/20261127_hu03_04_gestion_clientes.sql`. Agrega el indicador `clientes.activo` y las funciones protegidas para buscar/listar clientes, consultar sus compras y actualizar sus datos o estado. El backend expone `GET /api/clientes`, `GET /api/clientes/:id`, `POST /api/clientes` y `PATCH /api/clientes/:id`; requiere rol Propietario o Empleado. Desactivar conserva las fichas relacionadas, ventas, pedidos y abonos; no se borran registros.

La pantalla **Clientes** (`/clientes`) conserva el alta e incorpora búsqueda, contacto, resumen de ventas/saldo, historial de compras y abonos, edición y reactivación de fichas.

## HU-11 · Registrar pedido interno

Después de las migraciones de roles, clientes/ventas, clientes activos, estados/historial y carrito (incluida HU-15 si quieres que las ventas a crédito creen cuenta), ejecuta `migrations/20261128_hu11_pedidos_internos.sql`. Agrega a `pedidos` la ficha comercial, canal de origen y usuario responsable. Crea `crear_pedido_interno`, que solo permite al Propietario o Empleado registrar pedidos para una ficha activa recibidos por WhatsApp, teléfono o en persona. Reutiliza la creación transaccional del carrito: valida la fecha/hora, bloquea el horario y descuenta el inventario de forma atómica.

El backend expone `POST /api/pedidos/internos`, protegido para Propietario y Empleado. En el frontend está en **Registrar pedido interno** (`/pedido-interno`); el pedido aparecerá en Gestión de pedidos con su canal y quién lo registró. En la entrega, el empleado elige el método de pago como en un pedido del portal; si elige Crédito, la venta y la cuenta por cobrar quedan vinculadas a la ficha comercial seleccionada.

## HU-19 / HU-20 · Reportes y tablero del Propietario

Después de aplicar ventas, cartera, inventario y pedidos, ejecuta `migrations/20261129_hu19_20_reportes_tablero.sql`. Crea `reportes_resumen_propietario(desde,hasta)`, que solo puede ejecutar el Propietario. El backend expone `GET /api/reportes?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`; si se omiten fechas, usa el mes actual hasta hoy en Colombia. Incluye ventas y promedio, desglose por método de pago, productos más vendidos, ventas por cliente, saldos/mora de cartera, estados de pedidos y productos sin existencias.

La pantalla **Tablero y reportes** (`/reportes`) está en el menú del Propietario. Permite filtrar por período, exportar los reportes a CSV e imprimirlos. El aviso de inventario detecta productos con cero disponible; no se calcula “stock bajo” porque aún no existe un umbral mínimo configurado por producto.
