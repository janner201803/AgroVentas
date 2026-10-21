# Configuración de inventario y pedidos

1. En el SQL Editor del proyecto Supabase, ejecuta `migrations/20261020_pedidos_fecha_hora_inventario.sql`. Si ejecutaste una versión anterior, vuelve a ejecutarla para actualizar la política del administrador y habilitar la consulta de horarios.
2. Inicia sesión en AgroVentas con `admin@gmail.com` y abre **Ver inventario / agregar productos** desde Inicio. Completa nombre, cantidad y precio unitario. Los productos con cantidad y precio mayores que cero aparecen disponibles para pedidos.

La migración permite consultar el inventario a usuarios autenticados, limita el alta de productos a la cuenta `admin@gmail.com` y evita duplicar una fecha y hora de entrega. La aplicación usa solamente las columnas `id`, `nombre`, `cantidad` y `precio` en inventario. Completa el precio antes de que los productos se puedan pedir.
