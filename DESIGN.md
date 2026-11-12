# AgroVentas — Guía de diseño (dirección "Finca")

Propuesta de rediseño elegida por Juan David Alvarez el 12 de noviembre de 2026. Es una **propuesta en rama aparte**: no reemplaza la interfaz de `main` hasta que el equipo la apruebe. Los problemas que corrige están en `docs/diseno/auditoria.md`.

## Para quién y para qué

- **Producto:** portal de pedidos e inventario de una distribuidora mayorista de piña en Cali.
- **Quién lo usa:** clientes que piden por volumen y repiten; el administrador que registra existencias.
- **Dónde:** computador de escritorio. Se diseña desde 1024 px de ancho. No se debe romper lo que hoy se adapta a pantallas pequeñas, pero no es la prioridad.
- **Trabajo principal de la interfaz:** que el cliente vea qué hay, a cuánto, y deje su pedido con fecha y hora sin dudas.

## Idea central

La referencia no es una tienda en línea: es **la plaza de mercado y el guacal**. De ahí salen tres decisiones:

1. **El catálogo es una lista de precios**, como el tablero de un puesto mayorista: una fila por variedad con unidad, precio y disponibilidad. No una cuadrícula de tarjetas iguales con foto grande.
2. **La etiqueta de guacal** es el único elemento con carácter: el nombre de la variedad y su precio se escriben con una letra tipo Clarendon, la de los rótulos de cajas de fruta. Todo lo demás es sobrio.
3. **Los colores salen de la piña y de su empaque**: verde de la corona, papel de envolver, ocre de la cáscara. El amarillo del logo no se usa como fondo.

### Qué cambia respecto a la muestra que se eligió

La muestra usaba la tipografía Fraunces sobre fondo crema. Esa combinación (crema + serif de alto contraste + acento cálido) es hoy la más repetida en diseños generados por IA, que es justo lo que se quiere evitar. Se conserva la calidez y la paleta, y se cambia la letra de títulos por **Besley** (Clarendon), que sí pertenece al mundo de las cajas de fruta.

## Color

Definir como variables en `src/styles.css`. Ningún componente debe escribir colores a mano.

| Variable | Valor | Uso |
|---|---|---|
| `--papel` | `#F4EDE0` | Fondo de página |
| `--pliego` | `#FBF6EA` | Superficies: paneles, filas, campos |
| `--tinta` | `#2F2A1F` | Texto principal |
| `--tinta-suave` | `#5E5542` | Texto secundario, ayudas |
| `--hoja` | `#4A5D23` | Acción principal, enlaces, foco |
| `--hoja-oscura` | `#38481A` | Estado hover/activo de `--hoja` |
| `--panela` | `#8A5A14` | Texto de acento (precios destacados, avisos) |
| `--cascara` | `#C8862B` | Solo decorativo (filetes, marcas). Nunca texto |
| `--linea` | `#D9CDB4` | Separadores entre filas |
| `--borde` | `#8C8168` | Borde de campos y controles |

Estados (fondo / texto):

| Estado | Fondo | Texto |
|---|---|---|
| Correcto, confirmado, preparado | `#E3EBCF` | `#33441A` |
| Pendiente, aviso | `#F6E3B8` | `#6B4A0E` |
| Error, cancelado, rechazado | `#F6DDD3` | `#8C2A1B` |
| Neutro, entregado | `#E9E1CF` | `#4A4332` |

Contrastes medidos (mínimo exigido: 4,5 para texto y 3 para bordes de controles):

| Par | Contraste |
|---|---|
| `--tinta` sobre `--papel` / `--pliego` | 12,3 / 13,2 |
| `--tinta-suave` sobre `--papel` / `--pliego` | 6,3 / 6,8 |
| `--hoja` sobre `--papel` / `--pliego` | 6,3 / 6,8 |
| `--pliego` sobre `--hoja` (botón principal) | 6,8 |
| `--panela` sobre `--papel` / `--pliego` | 5,1 / 5,5 |
| `--borde` sobre `--pliego` / `--papel` | 3,6 / 3,3 |
| Estados (texto sobre su fondo) | entre 6,4 y 8,6 |

`--cascara` (2,8) y `--linea` (1,5) no alcanzan para texto ni para bordes de controles: por eso son solo decorativos.

Reglas:

- Sin degradados de fondo. El fondo es `--papel` liso.
- Un solo botón principal (relleno `--hoja`) por pantalla. Los demás son de contorno o enlaces.
- El estado nunca se comunica solo con color: siempre lleva texto ("Pendiente", "Cancelado").

## Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Rótulo | **Besley**, peso 500–600 | Título de página, nombre de variedad, precio en la etiqueta |
| Texto | **Work Sans**, pesos 400 y 500 | Todo lo demás: cuerpo, campos, botones, tablas |

- Instalar las fuentes dentro del proyecto (paquetes `@fontsource-variable/besley` y `@fontsource-variable/work-sans`; verificar el nombre exacto al instalar) para que la app no dependa de internet en la demo. Respaldo: `Georgia, serif` y `system-ui, sans-serif`.
- Escala (px): 14 · 16 · 18 · 22 · 28 · 36. Texto base 16, interlineado 1,5. Nada por debajo de 14.
- Cifras con `font-variant-numeric: tabular-nums` en precios, cantidades y horas, para que las columnas alineen.
- Títulos alineados a la izquierda. No centrar títulos de página.
- Prohibido: etiquetas en MAYÚSCULAS con espaciado, texto de 10–11 px, `text-transform: capitalize` en fechas (produce "12 De Noviembre De 2026").

## Espaciado, bordes y forma

- Escala de espacio: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Radio: 4 px en campos y botones, 8 px en paneles. Sin píldoras, salvo la marca de estado del pedido.
- Sin sombras. La separación se logra con `--linea` y con el cambio `--papel` → `--pliego`.
- Ancho máximo de contenido: 1120 px, alineado a la izquierda del área útil, con margen lateral de 32 px.

## Estructura de página

Un solo encabezado para toda la app (hoy hay tres distintos). **Requiere acuerdo del equipo**, que había decidido que cada página tuviera el suyo.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo]   Lista de precios   Hacer pedido   Mis pedidos   Inventario* │  ← nav
│                                              correo@…   Cerrar sesión │
├──────────────────────────────────────────────────────────────────────┤
│ Título de la página (Besley 36)                                       │
│ Una línea de contexto si hace falta                                   │
│                                                                      │
│ contenido                                                            │
└──────────────────────────────────────────────────────────────────────┘
* solo administrador
```

- La opción actual del menú se marca con `aria-current="page"` y un filete inferior `--hoja`.
- Primer elemento de la página: enlace "Saltar al contenido".
- Cada ruta define su `title` ("Hacer pedido · AgroVentas").

## Pantallas

### Inicio → "Lista de precios"

```
Lista de precios
Precios por variedad. Elige una para hacer tu pedido.

┌────────┬───────────────────┬──────────┬───────────┬──────────────┐
│ [foto] │ Piña pepa         │ por kg   │ $5.000    │ [ Pedir ]    │
│ [foto] │ Piña primera      │ por kg   │ $4.500    │ [ Pedir ]    │
│ [ — ]  │ Piña tercera      │ por und  │ $2.500    │ Agotada      │
└────────┴───────────────────┴──────────┴───────────┴──────────────┘
```

- Datos reales de `GET /api/inventario?disponibles=true`, no una lista fija en el HTML.
- Foto: recuadro fijo de 72 × 72 px. Mientras el dueño no envíe las fotos, se muestra un marcador liso `--linea` con las iniciales de la variedad. **No repetir la misma foto en todas las filas.**
- "Pedir" lleva a `/pedidos` con la variedad ya seleccionada (hoy el enlace envía la variedad pero el formulario la ignora).
- Se elimina el panel lateral de ayudas: ocupa espacio, usa emojis y afirma que se puede pagar por consignación, lo cual no es cierto hoy.

### Hacer pedido

Dos columnas en PC en lugar de una columna de 600 px que obliga a desplazarse:

```
Hacer pedido

┌─ 1. Qué necesitas ──────────────┐  ┌─ Tu pedido ─────────────┐
│ Variedad  [ Piña pepa      ▾ ]  │  │ Piña pepa               │
│ Cantidad  [ 3,5 ] kg            │  │ 3,5 kg × $5.000         │
│ Disponible: 120,5 kg            │  │ Total       $17.500     │
├─ 2. Cuándo lo recoges ──────────┤  │ Jueves 13 de noviembre  │
│ [calendario]   [horas]          │  │ 9:00 a. m.              │
│                                 │  │ Pago: efectivo al       │
│                                 │  │ recoger                 │
│                                 │  │ [ Registrar pedido ]    │
└─────────────────────────────────┘  └─────────────────────────┘
```

- La numeración 1–2 es válida porque sí es una secuencia.
- Horas: cuadrícula de 3 columnas que nunca se recorta (hoy la fila se corta a la derecha).
- El resumen de la derecha se queda fijo al desplazar y es donde vive el único botón principal.
- Mensajes de error junto al campo que los causa, además del aviso general.

### Mis pedidos

- Tabla, no tarjetas: Pedido · Variedad · Cantidad · Recogida · Total · Estado. Es información para comparar.
- Filtros como pestañas de texto con contador. Estado como marca con texto.
- Corregir la jerarquía de títulos (hoy salta de `h1` a `h3`).

### Inventario

- Tabla: Variedad · Unidad · Precio · Disponible · Comprometido · Última actualización. Las tarjetas actuales repiten "Unidad: kg / Precio: $5.000 / kg".
- El formulario de entrada va en un panel lateral derecho, siempre visible para el administrador.
- Debe tener el mismo encabezado y un camino de vuelta al inicio (hoy no lo tiene).

### Acceso (iniciar sesión, crear cuenta, recuperar)

Son las pantallas mejor resueltas. Solo se alinean a la guía: fuentes, colores, un `h1` por página, foco visible en los campos y contraste del texto secundario.

## Accesibilidad: piso obligatorio

1. `<html lang="es">` y configuración regional `es-CO` (moneda `$17.500`, fechas en español).
2. Foco visible en todo control: `outline: 3px solid var(--hoja); outline-offset: 2px`, definido una vez en `styles.css`.
3. Todo se puede hacer con teclado, en orden lógico. El calendario se recorre con flechas.
4. Un solo `h1` por página y títulos sin saltos de nivel.
5. Contraste según las tablas de arriba. Ningún texto por debajo de 14 px.
6. Cada campo con su `<label>`; los errores se asocian con `aria-describedby` y se anuncian con `role="alert"`.
7. Sin emojis como íconos. Íconos SVG con `aria-hidden="true"` si son decorativos, o con nombre accesible si son el único contenido de un botón.
8. `@media (prefers-reduced-motion: reduce)`: sin transiciones.
9. La página se puede ampliar al 200 % sin desplazamiento horizontal.

## Redacción

- Tratar de "tú", frases cortas, verbo primero en los botones: "Registrar pedido", "Agregar existencias".
- La misma acción se llama igual en todas partes ("Hacer pedido" en el menú, el título y el botón de la lista).
- Sin signos de exclamación ni eslóganes en pantallas de trabajo ("¡Conoce nuestras piñas!" → "Lista de precios").
- No prometer lo que no existe (consignación, carrito "Próximamente").
- Errores: qué pasó y qué hacer. "No hay suficiente piña pepa. Quedan 12 kg."

## Orden de implementación

Rama sugerida: `propuesta/rediseno-finca`, creada desde `main`. Un commit (o PR) por paso, para que cada uno se pueda revisar y probar solo.

1. **Bases** — variables de color y tipografía en `styles.css`, fuentes instaladas, `lang="es"`, regional `es-CO`, foco visible global, `prefers-reduced-motion`, `title` por ruta. No cambia la disposición.
2. **Encabezado y menú compartidos** — un componente usado por todas las páginas internas.
3. **Lista de precios** (inicio).
4. **Hacer pedido.**
5. **Mis pedidos.**
6. **Inventario.**
7. **Acceso.**
8. **Verificación** — repetir la auditoría (`docs/diseno/auditoria.md`) y actualizar las pruebas que dependan de textos o clases.

En cada paso: `npx ng build`, `npx ng test --watch=false` y revisar la pantalla en el navegador a 1280 px antes de hacer commit.

### Indicación para Claude Code

> Lee `DESIGN.md` y `docs/diseno/auditoria.md`. Implementa solo el paso N de "Orden de implementación". No cambies lógica de negocio, servicios ni backend. Usa únicamente las variables de `styles.css`; no escribas colores ni tamaños a mano. Al terminar, compila, corre las pruebas y muéstrame una captura de la pantalla a 1280 px.

## Decisiones abiertas

- **Logo:** se asume que el actual se mantiene. Sus verdes brillantes y su letra manuscrita no combinan del todo con esta guía; si se puede ajustar, conviene una versión de un solo color (`--hoja`).
- **Encabezado compartido:** contradice un acuerdo previo del equipo.
- **Fotos reales:** pendientes del dueño. Pedirlas cuadradas, con fondo liso y la misma luz.
- **Precios y estados reales:** los ejemplos de esta guía son ilustrativos.
