# AgroVentas — Auditoría de interfaz y accesibilidad

**Fecha:** 12 de noviembre de 2026 · **Versión revisada:** `main` en `ddb47bd` · **Norma:** WCAG 2.1 nivel AA

## Cómo se hizo y qué no cubre

- Se compiló el frontend y se abrieron las 8 pantallas en Chrome a 1280 px, con **datos simulados** (sin Supabase ni backend) y con los controles de acceso desactivados solo para la revisión.
- Por pantalla: análisis automático con axe-core, recorrido con la tecla Tab, estructura de títulos, tamaño de letra y ampliación al 200 %.
- **No se probó:** lector de pantalla real (NVDA, VoiceOver), el formulario de entrada de inventario (solo aparece con sesión de administrador), los mensajes de error con el backend real, ni el flujo de inicio de sesión con Google.
- Un análisis automático detecta solo una parte de los problemas. Lo marcado "por verificar" necesita revisión manual.

## Resumen

| Gravedad | Cantidad | Qué significa |
|---|---|---|
| Alta | 4 | Impide o dificulta seriamente el uso a algunas personas |
| Media | 15 | Confunde, estorba o incumple la norma sin bloquear |
| Baja | 4 | Pulido |

Lo más urgente: idioma de la página, contraste de textos, la fila de horas recortada y el texto que promete un medio de pago que no existe.

## Hallazgos de accesibilidad

### Perceptible

| # | Problema | Dónde | Criterio | Gravedad | Corrección |
|---|---|---|---|---|---|
| A1 | Texto con contraste insuficiente: etiquetas naranjas `#e96c20` sobre fondo claro (3,1; mínimo 4,5) y textos secundarios grises | Pedidos, Mis pedidos, Iniciar sesión, Crear cuenta, Recuperar contraseña | 1.4.3 | Alta | Usar la paleta de `DESIGN.md` |
| A2 | Texto de menos de 12 px: 19 elementos en Inicio, 11 en Pedidos, 2 en Mis pedidos y 2 en Inventario | Ver columna | 1.4.4 | Media | Mínimo 14 px |
| A3 | Emojis usados como íconos (🧺 📋 📦 🍍 💳): un lector de pantalla los lee en voz alta ("cesta", "portapapeles") | Inicio | 1.1.1 | Media | Íconos SVG con `aria-hidden` |
| A4 | Las 8 variedades usan la misma foto con textos alternativos distintos ("Fotografía de piña primera"): el texto describe algo que la imagen no muestra | Inicio | 1.1.1 | Media | Marcador neutro hasta tener fotos reales |
| A5 | Títulos sin orden: Inicio empieza por tres `h3` antes del `h1`; Mis pedidos salta de `h1` a `h3`; Iniciar sesión no tiene `h1` y las pantallas de acceso ponen un `h2` antes del `h1` | Ver columna | 1.3.1 | Media | Un `h1` por página, sin saltos |

### Operable

| # | Problema | Dónde | Criterio | Gravedad | Corrección |
|---|---|---|---|---|---|
| A6 | Los campos de texto no muestran contorno ni sombra al recibir el foco. **Por verificar:** puede que cambien el color del borde, lo que la prueba no detecta | Iniciar sesión, Crear cuenta, Recuperar contraseña | 2.4.7 | Media | Foco visible global |
| A7 | 26 paradas de teclado en Inicio y 35 en Pedidos, sin enlace "Saltar al contenido" | Inicio, Pedidos | 2.4.1 | Media | Agregar el enlace |
| A8 | El calendario se recorre día por día con Tab (hasta 30 paradas). **Por verificar** con teclado real | Pedidos | 2.1.1 | Media | Navegación con flechas |
| A9 | Todas las pestañas del navegador se llaman "AgroVentas" | Todas | 2.4.2 | Media | `title` por ruta |
| A10 | No se respeta la preferencia del sistema de reducir animaciones | Todas | 2.3.3 (AAA, recomendado) | Baja | `prefers-reduced-motion` |

### Comprensible

| # | Problema | Dónde | Criterio | Gravedad | Corrección |
|---|---|---|---|---|---|
| A11 | La página está declarada en inglés (`<html lang="en">`): un lector de pantalla pronuncia el español con voz inglesa | Todas | 3.1.1 | Alta | `lang="es"` |
| A12 | Moneda y fechas en formato de EE. UU.: `$17,500` en lugar de `$17.500` | Pedidos, Mis pedidos, Inventario | 3.1.1 | Media | Regional `es-CO` |
| A13 | Fechas con mayúsculas incorrectas: "Jueves, 12 De Noviembre De 2026", "Noviembre De 2026" | Pedidos | — | Baja | Quitar `text-transform: capitalize` |

### Robusto

El análisis automático no encontró controles sin nombre ni roles incorrectos, y todas las imágenes tienen atributo `alt`. Ampliar al 200 % no produjo desplazamiento horizontal en ninguna pantalla.

## Hallazgos de diseño y uso

| # | Problema | Dónde | Gravedad |
|---|---|---|---|
| D1 | La fila de horas de entrega se recorta a la derecha: la cuarta hora se ve cortada y las demás quedan fuera de la vista | Pedidos | Alta |
| D2 | El panel lateral dice "Paga en efectivo o por consignación con comprobante", pero solo se puede pagar en efectivo | Inicio | Alta |
| D3 | Tres encabezados distintos: Inicio (logo, cuenta, cerrar sesión), Pedidos y Mis pedidos (logo, volver), Inventario (logo, título centrado, cerrar sesión). Inventario no tiene cómo volver al inicio | Todas las internas | Media |
| D4 | 83 colores distintos escritos a mano y 3 familias tipográficas; no hay variables. Las pantallas de acceso usan otra letra que el resto | Todo el CSS | Media |
| D5 | El formulario de pedido ocupa una columna de 600 px en una pantalla de 1280: obliga a desplazarse por calendario y horas, y el resumen no se ve mientras se elige | Pedidos | Media |
| D6 | El catálogo de Inicio está escrito a mano en el HTML: no muestra precio ni disponibilidad, y no se actualiza con el inventario | Inicio | Media |
| D7 | Los enlaces "Elegir variedad" envían la variedad a Pedidos, pero el formulario no la preselecciona | Inicio → Pedidos | Media |
| D8 | Las tarjetas de inventario repiten datos ("Unidad: kg", "Precio: $5.000 / kg", "Existencias: 80 kg"). Para comparar productos sirve mejor una tabla | Inventario | Baja |
| D9 | Botón de carrito deshabilitado con "Próximamente": ocupa espacio y no hace nada | Pedidos | Baja |
| D10 | Rasgos que hacen que se vea genérica: fondo con degradado amarillo, etiquetas diminutas en MAYÚSCULAS sobre cada título, píldoras en todo, flecha "→" en los enlaces, eslóganes ("Directo del campo a tu mesa") | Todas | Media |

## Contraste medido

| Elemento | Texto | Fondo | Contraste | Mínimo | ¿Cumple? |
|---|---|---|---|---|---|
| Etiqueta naranja ("NUEVO PEDIDO") | `#e96c20` | `#fffdf5` | 3,1 | 4,5 | No |
| Descripción | `#82643c` | `#fffdf5` | 5,4 | 4,5 | Sí |
| Título verde | `#176b43` | `#fffdf5` | 6,4 | 4,5 | Sí |
| Mensaje de éxito | `#285d2f` | `#e0f0b6` | 6,4 | 4,5 | Sí |
| Mensaje de error | `#8e3328` | `#ffe0d5` | 6,4 | 4,5 | Sí |
| Botón principal | `#fff9e8` | `#176b43` | 6,2 | 4,5 | Sí |

Los textos secundarios de las pantallas de acceso que axe marca como insuficientes no se midieron uno por uno.

## Teclado

| Pantalla | Paradas de Tab | Foco visible |
|---|---|---|
| Iniciar sesión | 7 | Falta en los campos de texto (por verificar) |
| Crear cuenta | 9 | Falta en los campos de texto (por verificar) |
| Recuperar contraseña | 3 | Falta en el campo de texto (por verificar) |
| Restablecer contraseña | 1 | Sí (se vio solo el estado "Enlace no válido") |
| Inicio | 26 | Sí |
| Pedidos | 35 | Sí |
| Mis pedidos | 8 | Sí |
| Inventario | 3 | Sí (sin el formulario de administrador) |

## Orden de corrección sugerido

1. **A11, A12, A9, A6, A10** — se resuelven juntos en el paso "Bases" de `DESIGN.md`, sin cambiar la disposición de nada.
2. **D1 y D2** — errores visibles para cualquier usuario; son rápidos de corregir aunque no se haga el rediseño.
3. **A1, A2, D4** — llegan con la paleta y la tipografía nuevas.
4. **D3, A7** — con el encabezado compartido.
5. **El resto** — pantalla por pantalla, en el orden de `DESIGN.md`.

Al terminar cada pantalla, repetir esta auditoría sobre ella y probar con un lector de pantalla real.
