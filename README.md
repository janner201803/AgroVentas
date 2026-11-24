# AgroVentas

Aplicación web para administrar pedidos de piña, inventario, clientes, ventas y cartera. El proyecto está dividido en una interfaz Angular, una API Node.js/Express y una base de datos Supabase (PostgreSQL y autenticación).

> **Estado:** el proyecto sigue en desarrollo. El despliegue descrito explica cómo publicar los servicios, pero antes de ponerlos en producción hay que preparar la configuración de API y CORS indicada en [Despliegue](#despliegue). La base de datos también debe tener aplicadas las migraciones que requiere cada módulo.

## Tabla de contenido

- [Qué incluye](#qué-incluye)
- [Roles y guía de uso](#roles-y-guía-de-uso)
- [Arquitectura](#arquitectura)
- [Requisitos e instalación local](#requisitos-e-instalación-local)
- [Configuración](#configuración)
- [Base de datos Supabase](#base-de-datos-supabase)
- [Despliegue](#despliegue)
- [API del backend](#api-del-backend)
- [Solución de problemas](#solución-de-problemas)
- [Documentación relacionada](#documentación-relacionada)

## Qué incluye

| Área | Funcionalidad |
|---|---|
| Acceso | Registro, inicio y cierre de sesión, recuperación y restablecimiento de contraseña. Supabase Auth identifica al usuario. |
| Pedidos | El cliente arma un carrito, selecciona fecha y bloque horario disponible, confirma y consulta sus pedidos. |
| Gestión de pedidos | El personal consulta y filtra pedidos, revisa urgencias e historial y cambia el estado. La lista se actualiza periódicamente. |
| Pedidos internos | El personal registra pedidos recibidos por WhatsApp, teléfono o presencialmente para una ficha comercial. |
| Catálogo e inventario | El catálogo define nombre, unidad y precio; inventario guarda existencias. El personal consulta el saldo y registra entradas de cantidad. |
| Clientes | El personal crea y busca fichas comerciales, consulta compras y pagos, edita datos y activa/desactiva fichas. |
| Ventas | Al marcar un pedido como entregado se registra la venta con su detalle y método de pago. La consulta permite filtrar y paginar. |
| Cartera | El personal consulta cuentas por cobrar y registra abonos; la base recalcula saldo y estado. |
| Compras del cliente | El cliente autenticado consulta sus propias compras, pagos y saldos pendientes. |
| Usuarios | El Propietario consulta cuentas, asigna roles y activa/desactiva accesos. |
| Tablero y reportes | El Propietario consulta indicadores por período, exporta CSV e imprime los reportes. |

## Roles y guía de uso

La aplicación utiliza tres roles: **Propietario**, **Empleado** y **Cliente**. El menú y las rutas muestran opciones según el rol. El backend vuelve a validar sesión y rol, y Supabase aplica las reglas de acceso en la base; ocultar una opción en el navegador no sustituye esas validaciones.

| Rol | Acceso principal |
|---|---|
| Cliente | Inicio, realizar pedido, mis pedidos y mis compras/pagos. |
| Empleado | Funciones de cliente y operaciones de personal: inventario, pedidos internos, gestión de pedidos, clientes, ventas y cartera. |
| Propietario | Funciones del Empleado, administración de usuarios, catálogo de productos y tablero/reportes. |

### Recorrido de un cliente

1. Crea una cuenta o inicia sesión. El rol inicial se asigna en el perfil de Supabase; el registro público no debe permitir que una persona se asigne privilegios internos.
2. En **Inicio** consulta las variedades y entra a **Realizar pedido**.
3. En **Realizar pedido** agrega productos al carrito, selecciona cantidades y elige una fecha y una hora que no estén ocupadas. El pedido confirmado descuenta/reserva el stock de manera transaccional.
4. En **Mis pedidos** revisa estado, productos y horario. El historial de estados también puede consultarse cuando está disponible.
5. En **Mis compras y pagos** consulta las ventas y los saldos asociados a su propia cuenta. Esta opción solo aparece para cuentas con rol Cliente y requiere que el pedido/venta se haya vinculado correctamente a esa cuenta.

### Recorrido del personal

1. Inicia sesión con una cuenta a la que el Propietario haya asignado el rol **Empleado** o **Propietario**.
2. En **Inventario** consulta productos, unidades y existencias. Para sumar stock elige un producto del catálogo e ingresa la cantidad. La pantalla no crea el producto del catálogo.
3. El catálogo (nombre, unidad y precio) se mantiene actualmente en `public.productos` de Supabase. La migración limita sus cambios al Propietario; no existe una pantalla de catálogo en el menú actual.
4. En **Clientes** registra o busca una ficha comercial. Puede consultar sus datos, compras/abonos, editarla y desactivarla o reactivarla. Desactivar conserva el historial.
5. En **Registrar pedido interno** selecciona una ficha activa, añade productos, agenda la entrega y especifica si llegó por WhatsApp, teléfono o presencialmente.
6. En **Gestión de pedidos** filtra la lista, consulta el historial y avanza el estado permitido. Al entregar, selecciona el método de pago. Crédito requiere una ficha de cliente válida; la venta entregada a crédito crea una cuenta por cobrar.
7. En **Ventas** consulta las ventas registradas, con filtros por fecha/método y detalle de sus productos.
8. En **Cartera** revisa cuentas pendientes/parciales/pagadas e historial, y registra abonos en efectivo o transferencia. El abono no puede superar el saldo.

### Recorrido del Propietario

Además de las funciones del personal:

- **Usuarios:** filtra cuentas, cambia roles y activa/desactiva accesos. La cuenta del Propietario no puede quitarse a sí misma el rol ni desactivarse.
- **Tablero y reportes:** selecciona un período, consulta ventas, métodos de pago, productos/clientes destacados, cartera, pedidos e inventario sin existencias. Puede descargar CSV o imprimir.
- **Catálogo de productos:** mantiene `public.productos` en Supabase (Table Editor o la herramienta administrativa acordada por el equipo). Una fila representa un producto vendible; sus campos son `nombre`, `unidad` y `precio` además del ID.

**Ciclo de una venta:** el pedido se registra primero; el personal gestiona su preparación y entrega. Al confirmar la entrega se crea la venta. Si se escogió crédito, también se crea una cuenta por cobrar. Los pagos posteriores se registran como abonos en Cartera.

## Arquitectura

```text
Navegador
  ├── Angular (frontend/agroVentas)
  ├── Supabase Auth (sesión del usuario)
  └── API Express (backend, recibe el token Bearer)
        └── Supabase/PostgreSQL (datos, RPC, RLS y transacciones)
```

- **Frontend:** Angular standalone, Router, guards de autenticación/rol, servicios HTTP y cliente Supabase para autenticación y algunas consultas autorizadas.
- **Backend:** Node.js y Express. Las rutas usan controladores, servicios de aplicación, DTOs/reglas de dominio y repositorios Supabase. El middleware valida el token y crea un cliente Supabase por usuario para conservar el contexto de RLS.
- **Base de datos:** Supabase Auth y PostgreSQL. Funciones RPC resuelven operaciones que deben ser atómicas, como reservar existencias, crear pedidos y registrar abonos. Las migraciones SQL agregan esquema, vistas, funciones, triggers, grants y políticas.

La API expone `GET /` como comprobación básica. Esto solo confirma que Express arrancó; no prueba la conexión, permisos ni migraciones de cada función.

## Requisitos e instalación local

- Git.
- Node.js 24 LTS recomendado y npm. Angular 21 requiere una versión compatible de Node; conserva una versión actual de Node 24 para frontend y backend.
- Acceso al proyecto Supabase de desarrollo.

Desde PowerShell en la raíz del repositorio:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend/agroVentas ci
```

Configura Supabase según la sección siguiente. Para iniciar ambos procesos:

```powershell
npm run dev
```

- Frontend Angular: <http://localhost:4200>
- Backend Express: <http://localhost:3001>
- Comprobación de API: <http://localhost:3001/> (debe devolver `{"mensaje":"API de AgroVentas funcionando"}`).

También se pueden iniciar por separado, en terminales distintas:

```powershell
npm run start:front
npm run start:back
```

Para reinicio automático del backend durante desarrollo:

```powershell
npm --prefix backend run dev
```

Detén los procesos con `Ctrl+C`. No ejecutes dos copias del mismo servicio en los mismos puertos.

## Configuración

### Backend

Crea `backend/.env` localmente (no subas el archivo al repositorio):

```dotenv
PORT=3001
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_KEY=TU_CLAVE_PUBLICABLE
```

El backend acepta también los nombres `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. En producción, configura las variables desde el panel del proveedor; no copies `.env` al repositorio.

El backend usa la clave publicable junto con el token del usuario. **No pongas `service_role`, una clave secreta ni contraseñas en el frontend, en Git o en un README.** La clave publicable está diseñada para uso en cliente; la protección de datos depende de RLS y las validaciones de rol.

### Frontend

La configuración de autenticación de Supabase está en:

```text
frontend/agroVentas/src/enviroments/enviroment.ts
```

El archivo usa la URL del proyecto y una clave publicable. Confirma que apunte al proyecto correcto en cada ambiente. Nunca sustituyas esa clave por `service_role`.

**Configuración de API pendiente para despliegue:** varios servicios Angular tienen `http://localhost:3001` escrito directamente y el backend solo admite CORS desde `http://localhost:4200`. Eso funciona localmente, pero el navegador de producción intentaría llamar a su propio `localhost` y el backend remoto rechazaría el origen Netlify. Antes de publicar hay que centralizar la URL de API en configuración de entorno del frontend y permitir en CORS el dominio exacto del frontend publicado (y los dominios de prueba que el equipo autorice). Los archivos encontrados son `pedido.service.ts`, `inventario.service.ts`, `clientes.service.ts`, `cartera.service.ts`, `compras.service.ts`, `usuario.service.ts` y `reportes.service.ts`.

No declares `API_URL` en Netlify esperando que Angular la lea automáticamente: con la configuración actual no hay sustitución de variables en tiempo de ejecución. Hay que implementar la configuración en el código y reconstruir el frontend después de cada cambio de ambiente.

## Base de datos Supabase

El backend **no crea el esquema automáticamente**. El proyecto parte de tablas existentes como `public.pedidos` e `inventario`; aplicar una migración asume que existen las tablas y dependencias que indica su archivo. Revisa el esquema compartido y el contenido de cada migración antes de ejecutarla. No ejecutes scripts sobre producción sin revisar impacto, respaldo y autorización del responsable de datos.

Las migraciones están en `backend/supabase/migrations/`. Para el esquema cubierto por las funcionalidades actuales, el orden documentado es:

1. `20261020_pedidos_fecha_hora_inventario.sql`
2. `20261101_catalogo_productos_inventario_acumulable.sql`
3. `20261102_reserva_stock_pedidos.sql`
4. `20261109_inventario_actualizacion_comprometido.sql`
5. `20261115_roles_perfiles.sql`
6. `20261116_inventario_empleado.sql`
7. `20261119_estados_historial_pedidos.sql`
8. `20261121_carrito.sql`
9. `20261122_clientes_ventas.sql`
10. `20261123_hu15_cuentas_por_cobrar.sql`
11. `20261124_detalle_ventas.sql`
12. `20261125_hu16_cartera_abonos.sql`
13. `20261126_hu09_compras_cliente.sql`
14. `20261127_hu03_04_gestion_clientes.sql`
15. `20261128_hu11_pedidos_internos.sql`
16. `20261129_hu19_20_reportes_tablero.sql`

Ejecuta solo las migraciones que aún no estén aplicadas, en el SQL Editor de Supabase, y sigue las precondiciones/comentarios de cada archivo. Varias migraciones históricas requieren que `productos`, `inventario` y `pedidos` ya tengan la estructura descrita en [SETUP de Supabase](backend/supabase/SETUP.md). La migración de roles define las reglas que usan empleados y propietarios; no te saltes ese paso para habilitar esas funciones.

La pantalla de reportes depende de la función `reportes_resumen_propietario`. Si la función ya se instaló antes de la corrección de la referencia `productos.id_producto`, ejecuta de nuevo el contenido actualizado de `20261129_hu19_20_reportes_tablero.sql` para reemplazarla.

Las cuentas y datos de usuarios viven en el Supabase seleccionado. No uses datos reales de clientes en pruebas sin autorización. Para ver requisitos y efectos de las migraciones de inventario/pedidos, consulta [backend/supabase/SETUP.md](backend/supabase/SETUP.md).

## Despliegue

El frontend Angular es una aplicación estática y se publica en **Netlify**. La API Express es un servicio web persistente y se publica como **Web Service en Render**. Supabase sigue siendo el proveedor de autenticación y base de datos.

> **Importante:** los pasos de hosting pueden desplegar artefactos, pero la aplicación desplegada no funcionará de punta a punta hasta resolver la URL fija `localhost:3001` del frontend y el CORS fijo `localhost:4200` del backend descritos en [Configuración de API pendiente](#frontend). Primero prepara esos cambios en el código, prueba localmente y luego publica ambos servicios.

### 1. Publicar el backend en Render

1. Sube el repositorio a GitHub y confirma que `backend/package.json` y `backend/package-lock.json` están incluidos; no subas `backend/.env`.
2. En Render crea **New → Web Service** y conecta el repositorio.
3. Configura:

   | Campo | Valor |
   |---|---|
   | Root Directory | `backend` |
   | Runtime | Node |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Health Check Path | `/` |

4. En **Environment**, agrega `SUPABASE_URL` y `SUPABASE_KEY` con los valores de Supabase. No establezcas `PORT`: Render asigna ese puerto y el backend usa `process.env.PORT`.
5. Cuando el servicio termine de desplegar, abre su URL HTTPS raíz; debe responder el JSON `API de AgroVentas funcionando`. Guarda la URL pública, por ejemplo `https://agroventas-api.onrender.com`.
6. Configura CORS en el backend para permitir el origen HTTPS exacto de Netlify. No uses `*` para una API autenticada si puedes permitir únicamente los dominios del proyecto.
7. Vuelve a desplegar el servicio después de actualizar variables o código.

Render documenta el despliegue de servicios web Express, el binding al puerto y la gestión de variables en [Web Services](https://render.com/docs/web-services) y [Environment Variables](https://render.com/docs/configure-environment-variables). Verifica las condiciones del plan elegido; algunos planes pueden suspender servicios inactivos y hacer más lenta la primera petición.

### 2. Publicar el frontend en Netlify

1. En Netlify crea un sitio desde Git y selecciona el repositorio.
2. Configura la aplicación Angular que está dentro del monorepo:

   | Campo | Valor |
   |---|---|
   | Base directory | `frontend/agroVentas` |
   | Build command | `npm run build` |
   | Publish directory | `dist/agroVentas/browser` |

   La carpeta de publicación se interpreta desde la base `frontend/agroVentas`.

3. Antes del build de producción, configura el frontend para usar la URL HTTPS de Render en vez de `localhost:3001`, y apunta la autenticación a la instancia de Supabase correcta.
4. Publica el sitio. La aplicación usa rutas de Angular; si al abrir o recargar una ruta interna aparece 404, configura el fallback SPA `/* /index.html 200` mediante `netlify.toml` o `_redirects` en el directorio publicado. Comprueba también que los enlaces de confirmación/recuperación de Supabase acepten el dominio Netlify y sus rutas de retorno.
5. Copia el dominio final, por ejemplo `https://agroventas.netlify.app`, y agrégalo a la lista de orígenes CORS permitidos en el backend. Vuelve a desplegar backend y frontend.
6. Prueba inicio/cierre de sesión y, al menos, una consulta y una operación de escritura por cada rol en el ambiente de prueba.

Consulta [Angular en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/angular/) y la [guía de redirecciones SPA](https://docs.netlify.com/resources/troubleshooting/page-not-found-error-guide/). Netlify usa la carpeta de salida generada por Angular; no publiques `src` ni `node_modules`.

### Orden recomendado de publicación

1. Preparar y probar la configuración de entorno frontend/API/CORS.
2. Confirmar el proyecto Supabase, migraciones y políticas RLS.
3. Desplegar el backend en Render y comprobar `/`.
4. Configurar la URL HTTPS de Render en el frontend.
5. Desplegar Angular en Netlify.
6. Permitir el dominio Netlify en CORS y comprobar rutas, roles y flujos completos con datos de prueba.

## API del backend

Todas las rutas funcionales requieren `Authorization: Bearer <access_token>` salvo `GET /`. El token se obtiene durante el inicio de sesión de Supabase; no se debe pegar en código, README, capturas públicas ni issues.

| Ruta | Operaciones principales | Acceso |
|---|---|---|
| `/` | Estado básico de la API. | Público |
| `/api/pedidos` | Crear y consultar pedidos propios; `/horarios` consulta bloques; `/gestion` lista; `/:id/estado` cambia estado; `/:id/historial` consulta historial. | Cliente autenticado; gestión solo Propietario/Empleado |
| `/api/pedidos/internos` | Registra pedido de una ficha comercial. | Propietario/Empleado |
| `/api/inventario` | Lista existencias disponibles; `POST` registra entrada; `/resumen` consulta stock y productos. | Autenticado; escrituras/resumen solo personal |
| `/api/productos` | Lista catálogo para formularios. | Autenticado |
| `/api/clientes` | Buscar/listar, crear, consultar detalle y actualizar ficha. | Propietario/Empleado |
| `/api/cartera` | Listar cuentas y registrar `/:id/abonos`; `/mis-compras` lista compras propias. | Personal; `/mis-compras` Cliente |
| `/api/usuarios` | Listar cuentas y cambiar rol/estado. | Propietario |
| `/api/reportes` | Resumen por rango `?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`. | Propietario |

La base de datos realiza validaciones adicionales. Algunos nombres y respuestas dependen de las funciones RPC instaladas; consulta los controladores, servicios y repositorios dentro de `backend/src` para el detalle del contrato.

## Solución de problemas

- **El backend no inicia:** revisa que `backend/.env` exista localmente, que sus variables tengan URL/clave válidas y que el puerto no esté ocupado.
- **401 / “Debes iniciar sesión”:** inicia sesión nuevamente; la petición debe enviar un token vigente en `Authorization: Bearer ...`.
- **403:** el usuario inició sesión, pero su perfil no tiene el rol necesario o la cuenta está desactivada. Revisa `public.perfiles` con el Propietario.
- **503 que menciona una migración:** ejecuta la migración indicada solo después de confirmar sus precondiciones y estado actual del esquema.
- **Error RLS o `new row violates row-level security policy`:** revisar política, rol, función RPC y token de usuario. No desactives RLS como arreglo general.
- **`42703 column ... does not exist` o `23503 foreign key`:** la consulta o relación no coincide con el esquema real. Compara la migración y las claves foráneas de Supabase; no cambies relaciones a ciegas.
- **CORS en producción:** el dominio de Netlify debe estar permitido por el backend. `localhost:4200` no es el origen publicado.
- **El navegador intenta llamar a `localhost:3001` después del despliegue:** la URL de API sigue fijada en los servicios Angular; cambiar una variable en el panel de Netlify no la sustituye con el código actual.
- **Al recargar una ruta Netlify aparece 404:** falta el fallback SPA a `index.html`.
- **Pedido no disponible o sin horario:** confirma que hay existencias y que la fecha/bloque horario sigue libre. La validación final ocurre en Supabase al guardar, así que una selección puede dejar de estar disponible antes de confirmar.
- **Tablero falla tras desplegar una versión anterior de su función:** vuelve a aplicar la versión corregida de la migración `20261129_hu19_20_reportes_tablero.sql`.

Consulta los logs del servicio backend en Render y la consola de red del navegador. No publiques tokens, claves privadas ni datos personales al reportar un error.

## Documentación relacionada

- [Configuración y migraciones de Supabase](backend/supabase/SETUP.md)
- [Roles y acuerdos del equipo](docs/equipo/roles.md)
- [Organización semanal del equipo](docs/equipo/semanas/2026-10-19.md)
- [Historias de usuario actualizadas](docs/entrega/historias-actualizadas.pdf)
- [Requisitos actualizados](docs/entrega/requisitos-actualizados.pdf)
