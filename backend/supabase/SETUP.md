# Configuración de inventario y pedidos

1. En el SQL Editor del proyecto Supabase, ejecuta `migrations/20261020_pedidos_fecha_hora_inventario.sql`. Si ejecutaste una versión anterior, vuelve a ejecutarla para actualizar la política del administrador y habilitar la consulta de horarios.
2. Inicia sesión en AgroVentas con `admin@gmail.com` y abre **Ver inventario / agregar productos** desde Inicio. Completa nombre, unidad (`kg` o `und`), cantidad y precio por unidad de medida. Los productos con cantidad y precio mayores que cero aparecen disponibles para pedidos.

La migración permite consultar el inventario a usuarios autenticados, limita el alta de productos a la cuenta `admin@gmail.com` y evita duplicar una fecha y hora de entrega. La aplicación usa las columnas `id`, `nombre`, `cantidad`, `precio` y `und` en inventario. Completa el precio y selecciona la unidad antes de que los productos se puedan pedir.
