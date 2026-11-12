# HU-08 — Consultar estado de pedidos

> Estado al 12 de noviembre de 2026: **incremento parcial listo para revisión**. La historia no se da por cerrada (ver "Lo que falta para cerrarla").

## Historia

**Como** cliente de la comercializadora, **quiero** consultar mis pedidos y el estado en que se encuentran, **para** saber si fueron recibidos y cuándo debo recogerlos sin tener que llamar o escribir.

| Campo | Valor |
|---|---|
| Requisitos relacionados | RF-06 y RF-08 |
| Prioridad | Según el documento oficial de historias (05/11) |
| Estimación original | 4 h-persona (preliminar) |
| Responsable de la historia | Por confirmar por el equipo (el documento oficial del 05/11 la deja sin responsable) |
| Implementación de este incremento | Juan David Alvarez (`@InfinixCox`) |
| Revisor | Por definir; debe ser una persona distinta del autor (`docs/equipo/roles.md`) |
| Depende de | HU-07 (crear pedido) para tener datos; HU-12 (cambio de estado por el personal) para ver el ciclo completo |

## Por qué se hizo así

En la demo del 29 de octubre la profesora pidió **separar "consultar pedido" de "crear pedido"**. Hasta ahora el historial vivía al final del formulario de `/pedidos`, y el menú de inicio decía "Mis pedidos" pero llevaba al formulario de creación.

## Qué cambia

| Antes | Ahora |
|---|---|
| El historial estaba debajo del formulario de `/pedidos`. | Pantalla propia `/mis-pedidos`, solo de consulta, protegida con `authGuard`. |
| El menú de inicio mostraba un único enlace ("Mis pedidos" o "Realizar pedido" según el rol) que abría `/pedidos`. | Dos enlaces: **Realizar pedido** (`/pedidos`) y **Mis pedidos** (`/mis-pedidos`). |
| Tras registrar un pedido, la lista se recargaba más abajo en la misma página. | El mensaje de éxito incluye el enlace "Ver mis pedidos →". `/pedidos` ya no consulta el historial. |
| No se podía filtrar ni refrescar. | Filtro por grupo de estado con contador, botón **Actualizar** y hora de la última consulta. |
| Sin pruebas de esta historia. | 8 pruebas automáticas (`mis-pedidos.spec.ts`). |

No cambia el backend, la base de datos ni el contrato de `GET /api/pedidos`.

### Archivos

- `frontend/agroVentas/src/app/pages/mis-pedidos/` — `mis-pedidos.ts`, `.html`, `.css`, `.spec.ts` (nuevos).
- `frontend/agroVentas/src/app/app.routes.ts` — ruta `mis-pedidos`.
- `frontend/agroVentas/src/app/pages/inicio/inicio.html` — enlaces del menú.
- `frontend/agroVentas/src/app/pages/pedidos/pedidos.ts`, `.html`, `.css` — se retira el historial y se enlaza a la nueva pantalla.

La pantalla nueva reutiliza `pedidos.css` (misma paleta y tarjetas de la rama `diseno/pedidos-estilo-inicio`, PR #11) y solo añade los estilos del filtro en `mis-pedidos.css`.

## Cómo funciona

1. `/mis-pedidos` llama a `GET /api/pedidos` con el token de la sesión.
2. El backend toma el usuario **del token** (`req.user.id`) y filtra `pedidos.id_usuario` en `PedidoRepository.listarPorUsuario`; el cliente no envía ningún identificador, así que no puede pedir los pedidos de otra persona desde la pantalla. La barrera de fondo sigue siendo la RLS de Supabase, que no está versionada en el repositorio.
3. Cada tarjeta muestra producto, referencia, estado, cantidad con su unidad, fecha y hora de entrega, valor y medio de pago.
4. Filtros:

| Filtro | Estados que incluye |
|---|---|
| Todos | Cualquiera, incluso uno que la pantalla no conozca |
| En curso | `pendiente`, `confirmado`, `preparado` |
| Entregados | `entregado` |
| Cancelados | `cancelado`, `rechazado` |

5. **Actualizar** repite la consulta. No hay actualización automática ni en tiempo real.

## Criterios de aceptación propuestos

Son una propuesta para validar con el usuario real; no reemplazan su aceptación.

| # | Criterio (lenguaje de cliente) | Estado |
|---|---|---|
| CA-1 | Puedo abrir "Mis pedidos" desde el inicio sin pasar por el formulario de pedido. | Implementado |
| CA-2 | Veo solo mis pedidos, con producto, cantidad, fecha y hora de recogida, valor y estado. | Implementado; falta comprobarlo con dos cuentas reales (P-HU08-09) |
| CA-3 | Si todavía no he pedido nada, la pantalla me lo dice y me deja ir a hacer un pedido. | Implementado |
| CA-4 | Puedo ver solo los pedidos en curso, entregados o cancelados. | Implementado |
| CA-5 | Si la consulta falla, veo un mensaje comprensible y puedo reintentar. | Implementado |
| CA-6 | Cuando el personal cambia el estado de mi pedido, lo veo al actualizar. | **Bloqueado por HU-12**: hoy no existe forma de cambiar el estado desde la aplicación |

## Pruebas

Ejecución del 12/11/2026, Node 22, `npx ng test --watch=false --include src/app/pages/mis-pedidos/mis-pedidos.spec.ts`. Son pruebas de caja negra sobre el componente con el servicio simulado: no se conectan al backend ni a Supabase.

| ID | Caso | Entrada | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| P-HU08-01 | Datos del pedido | 1 pedido `confirmado`, 3,5 kg, 13/11/2026 09:00, $17.500, efectivo | La tarjeta muestra producto, cantidad y unidad, fecha, hora, valor, estado y pago | Aprobada |
| P-HU08-02 | Sin pedidos | Lista vacía | "Aún no tienes pedidos" y contador en 0 | Aprobada |
| P-HU08-03 | Filtro por estado | 5 pedidos (pendiente, "Preparado " con mayúscula y espacio, entregado, cancelado, rechazado) | Contadores 5 / 2 / 1 / 2; "Cancelados" deja 2 tarjetas | Aprobada |
| P-HU08-04 | Filtro sin coincidencias | 1 pedido pendiente, filtro "Entregados" | "No tienes pedidos en este estado" | Aprobada |
| P-HU08-05 | Estado desconocido (inválido) | Estado `en ruta` y estado vacío | Se muestra tal cual / "Sin estado"; solo aparece en "Todos" | Aprobada |
| P-HU08-06 | Error del servidor | Respuesta 500 y luego respuesta correcta | Mensaje del servidor; "Intentar de nuevo" consulta otra vez y muestra el pedido | Aprobada |
| P-HU08-07 | Backend caído | Error de conexión (estado 0) | "No se pudo conectar con el servidor" | Aprobada |
| P-HU08-08 | Actualizar | Primero `pendiente`, luego `entregado` | Segunda consulta y la tarjeta pasa a "Entregado" | Aprobada |

Además: `npx ng build` y `npx ng build --configuration development` compilan sin errores, y se revisó la pantalla en Chrome a 1280 px y 390 px con datos simulados (sin desplazamiento horizontal, sin errores de consola).

**Pendientes de ejecutar a mano con el entorno del equipo:**

| ID | Caso | Resultado esperado |
|---|---|---|
| P-HU08-09 | Iniciar sesión con dos cuentas de cliente distintas | Cada una ve únicamente sus pedidos |
| P-HU08-10 | Registrar un pedido en `/pedidos` y abrir "Ver mis pedidos →" | El pedido aparece como "Pendiente" con los datos registrados |
| P-HU08-11 | Recargar `/mis-pedidos` (F5) con sesión activa | La lista se vuelve a cargar; sin sesión redirige a `/login` |

Nota: `ng test` completo sigue sin compilar en esta rama por `inventario.spec.ts` (lo corrige el PR #13). Para ejecutar solo estas pruebas antes de que ese PR se fusione hay que apartar temporalmente ese archivo.

## Lo que falta para cerrarla

- **HU-12**: sin cambio de estado por el personal, todos los pedidos reales están en `pendiente`; el filtro y CA-6 no se pueden demostrar con datos reales.
- **Estados**: el documento de historias habla de 4 estados y el código maneja 6. Hay que acordar la lista con el usuario real; el cambio en la pantalla es una constante (`ESTADOS_POR_FILTRO` y `ETIQUETAS_ESTADO`).
- **Pedidos con varios productos**: hoy un pedido tiene un solo producto; cuando HU-07 incorpore el carrito habrá que ajustar la tarjeta.
- **Formato regional**: la aplicación no registra `es-CO`, por eso el valor sale como `$17,500` en lugar de `$17.500`. Afecta a toda la aplicación, no solo a esta pantalla.
- **Referencia del pedido**: se muestra el identificador completo (UUID). Decidir si se quiere un número corto.
- Validación de los criterios con el usuario real y revisión del PR por otra persona del equipo.
