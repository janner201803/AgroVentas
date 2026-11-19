# AgroVentas — Verificación del rediseño "Finca"

**Fecha:** 13 de noviembre de 2026 · **Rama:** `propuesta/rediseno-finca` · **Norma:** WCAG 2.1 nivel AA

Repite la auditoría de `auditoria.md` sobre las 8 pantallas después de aplicar los pasos 1 a 7 de `DESIGN.md`.

## Resultado

- Los 23 hallazgos de la auditoría quedan corregidos, salvo dos parciales (A12 y D10) y uno implementado pero no probado (A10).
- axe-core no reporta ninguna infracción ni ningún caso "por revisar" en las 8 pantallas.
- `npx ng build` compila y `npx ng test --watch=false` pasa 40 de 40 pruebas.

## Cómo se hizo y qué no cubre

- Chrome sin interfaz a 1280 px, con el servidor de desarrollo. Por pantalla: axe-core 4.10.2 (reglas WCAG 2.0 y 2.1 A y AA, más buenas prácticas), recorrido con la tecla Tab real, estructura de títulos, tamaño mínimo de letra y desbordamiento a 640 px de ancho (equivale a ampliar al 200 %).
- Control: axe-core se ejecutó también sobre una página defectuosa a propósito y encontró 7 reglas incumplidas, así que el cero de las pantallas no se debe a que la herramienta no corriera.
- **Datos simulados.** Las pantallas internas se abrieron con una sesión de administrador y datos de ejemplo inyectados de forma temporal en los servicios. Nada se probó contra el backend ni Supabase.
- **No se probó:** lector de pantalla real (NVDA, VoiceOver); iniciar sesión, registrarse, recuperar contraseña y el flujo con Google; registrar un pedido y agregar existencias de verdad; "Cerrar sesión"; el menú visto como cliente (sin "Inventario"); la preferencia de reducir animaciones; los estados "Contraseña cambiada" y "Enlace no válido" de restablecer con un enlace real.
- Un análisis automático detecta solo una parte de los problemas de accesibilidad.

## Hallazgos de accesibilidad

| # | Problema original | Estado | Evidencia |
|---|---|---|---|
| A1 | Contraste insuficiente | Corregido | axe: 0 casos. Pares calculados abajo |
| A2 | Texto de menos de 12 px | Corregido | Letra mínima medida: 14 px en las 8 pantallas |
| A3 | Emojis como íconos | Corregido | Ninguno en las plantillas; los íconos son SVG con `aria-hidden` |
| A4 | Misma foto con textos alternativos distintos | Corregido | Marcador con iniciales, oculto a lectores, hasta tener fotos reales |
| A5 | Títulos sin orden | Corregido | Un `h1` por pantalla y sin saltos (tabla abajo) |
| A6 | Campos sin foco visible | Corregido | Todas las paradas de Tab muestran el contorno de 3 px |
| A7 | Sin "Saltar al contenido" | Corregido | Es la primera parada en las 4 pantallas internas y lleva el foco al contenido |
| A8 | Calendario día por día con Tab | Corregido | 1 sola parada; flechas probadas, incluido el cambio de mes |
| A9 | Todas las pestañas se llaman "AgroVentas" | Corregido | Título propio en las 8 rutas |
| A10 | No respeta reducir animaciones | Implementado, sin probar | Regla global en `styles.css` |
| A11 | Página declarada en inglés | Corregido | `lang="es"` |
| A12 | Moneda y fechas en formato de EE. UU. | Parcial | Sale `$ 17.500`, con espacio; la guía pone `$17.500` |
| A13 | "12 De Noviembre De 2026" | Corregido | "Viernes, 13 de noviembre de 2026" |

## Hallazgos de diseño y uso

| # | Problema original | Estado | Evidencia |
|---|---|---|---|
| D1 | Fila de horas recortada | Corregido | Cuadrícula de 3 columnas; sin desbordamiento a 640 px |
| D2 | Promete pago por consignación | Corregido | Se quitó el panel; el resumen dice "Efectivo al recoger" |
| D3 | Tres encabezados distintos | Corregido | Un componente en las 4 pantallas internas; Inventario ya tiene menú |
| D4 | 83 colores a mano y 3 familias | Corregido | 0 colores a mano en el CSS de componentes; 2 familias, por variable |
| D5 | Formulario en columna de 600 px | Corregido | Dos columnas con resumen fijo |
| D6 | Catálogo escrito a mano | Corregido | Lee `GET /api/inventario?disponibles=true` (visto solo con datos simulados) |
| D7 | "Elegir variedad" no preselecciona | Corregido | "Pedir" abre `/pedidos?producto=1` con la variedad elegida |
| D8 | Tarjetas de inventario repetitivas | Corregido | Tabla |
| D9 | Carrito "Próximamente" | Corregido | Quitado |
| D10 | Rasgos genéricos | Parcial | Sin degradados, etiquetas en mayúsculas ni flechas. El logo conserva "Del campo a tu mesa" |

## Por pantalla

| Pantalla | Infracciones axe | Paradas de Tab (antes → ahora) | Sin foco visible | Desborde a 640 px |
|---|---|---|---|---|
| Iniciar sesión | 0 | 7 → 7 | 0 | No |
| Crear cuenta | 0 | 9 → 9 | 0 | No |
| Recuperar contraseña | 0 | 3 → 3 | 0 | No |
| Restablecer contraseña | 0 | 1 → 4 | 0 | No |
| Lista de precios | 0 | 26 → 11 | 0 | No |
| Hacer pedido | 0 | 35 → 20 | 0 | No |
| Mis pedidos | 0 | 8 → 13 | 0 | No |
| Inventario | 0 | 3 → 9 | 0 | No |

Las paradas no son comparables una a una. Restablecer se midió antes en "Enlace no válido" y ahora con el formulario. Mis pedidos se midió antes con otros datos; ahora con 4 pedidos y sus filtros. Inventario se midió antes sin el formulario de administrador y sin menú.

## Títulos

| Pantalla | Estructura |
|---|---|
| Iniciar sesión, Crear cuenta, Recuperar, Restablecer | Solo `h1` |
| Lista de precios, Mis pedidos | Solo `h1` |
| Hacer pedido | `h1` · `h2` 1. Qué necesitas · `h2` 2. Cuándo lo recoges · `h3` Día · `h3` Hora · `h2` Tu pedido |
| Inventario | `h1` · `h2` Existencias · `h2` Agregar existencias |

## Interacciones comprobadas

| Qué | Resultado |
|---|---|
| "Saltar al contenido" | Se ve al recibir el foco y lo lleva a `#contenido` |
| "Pedir" en la lista | Abre Hacer pedido con Piña pepa elegida y el menú marca "Hacer pedido" |
| Calendario: flecha izquierda desde hoy | No retrocede a una fecha pasada |
| Calendario: derecha y tres veces abajo | Pasa del 13 de noviembre al 5 de diciembre y cambia el mes mostrado |
| Calendario: barra espaciadora | Elige el día, conserva el foco y actualiza el resumen |
| Registrar sin variedad | Aviso general, `aria-invalid` en Variedad y mensaje bajo el campo |
| Registrar sin cantidad, o con más de lo disponible | `aria-invalid` en Cantidad y mensaje bajo el campo |
| Filtro "Cancelados" | Deja 1 fila y marca la pestaña con `aria-pressed` |
| Buscador de inventario ("PINA pe") | Deja "Piña pepa" y el contador dice "1 de 3 productos" |

Al comprobarlas apareció un fallo, ya corregido: con variedad elegida y sin cantidad, el mensaje bajo "Cantidad" decía "Selecciona un producto…". Ahora dice "Indica una cantidad mayor que cero."

## Contraste calculado

Mínimo exigido: 4,5 para texto y 3 para bordes de controles.

| Par | Uso | Contraste |
|---|---|---|
| `--tinta` sobre `--papel` / `--pliego` | Texto | 12,3 / 13,2 |
| `--tinta-suave` sobre `--papel` / `--pliego` | Texto secundario | 6,3 / 6,8 |
| `--hoja` sobre `--papel` / `--pliego` | Enlaces, opción actual del menú | 6,3 / 6,8 |
| `--pliego` sobre `--hoja` / `--hoja-oscura` | Botón principal, día y hora elegidos | 6,8 / 9,2 |
| `--panela` sobre `--pliego` | Precios y totales | 5,5 |
| `--tinta-suave` sobre `--linea` | Iniciales del marcador de foto | 4,7 |
| `--tinta-suave` sobre fondo neutro | Campo deshabilitado | 5,7 |
| Estados (texto sobre su fondo) | Marcas y avisos | 6,4 a 8,6 |
| `--borde` sobre `--pliego` / `--papel` | Borde de controles | 3,6 / 3,3 |

## Pruebas

40 de 40. Antes del rediseño pasaban 28 de 32.

- **Corregidas** (fallaban desde antes): `app.spec.ts` esperaba el texto de la plantilla inicial de Angular; las de iniciar sesión y crear cuenta no tenían proveedor de rutas.
- **Reescrita:** la de Inicio, ahora sobre la lista de precios.
- **Ajustadas al cambio de pantalla:** una comprobación en Mis pedidos (la hora pasó de `09:00` a `9:00 a. m.`) y tres en Inventario (de tarjetas a filas de tabla).
- **Nueva:** `pedidos.preseleccion.spec.ts`.
- Las flechas del calendario y los errores junto al campo no tienen prueba automática; se comprobaron en el navegador.

## Pendiente

1. Probar contra el backend real y con un lector de pantalla.
2. "Agotada" está implementada, pero ese endpoint solo devuelve variedades con existencias, así que hoy no aparece.
3. Avisos de tamaño al compilar: el paquete inicial pesa 511 kB (límite de aviso, 500 kB) y tres hojas de estilo pasan de 4 kB. No son errores.
4. Quedan sin uso `public/img/piñaPepa.jpg` y los tres SVG de `public/img/iconos/`.
5. Las consultas de ancho (`@media`) llevan el número escrito a mano porque no admiten variables.
6. Decisiones abiertas de `DESIGN.md`: el encabezado único contradice un acuerdo del equipo, el logo se ve pequeño y faltan las fotos reales.
