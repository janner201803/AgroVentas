# AgroVentas 2.0

Proyecto académico de una aplicación web para apoyar la gestión
de productos y pedidos de una comercializadora de piña.

El código actual utiliza Angular para la interfaz, Node.js con Express
para la API y Supabase para autenticación y persistencia.

## Estado del proyecto

El proyecto está en desarrollo.

Que los servidores arranquen no demuestra que todos los recorridos
de negocio, permisos o configuraciones de Supabase estén completos.

Las instrucciones siguientes corresponden a la organización actual
del código y a la corrección de los scripts de arranque de la raíz.

## Organización del equipo

- [Roles y acuerdos del equipo](docs/equipo/roles.md)
- [Plan del 19 al 25 de octubre de 2026](docs/equipo/semanas/2026-10-19.md)

El plan semanal contiene las asignaciones propuestas, las tareas
y las evidencias esperadas.

El seguimiento diario se realiza en el GitHub Project enlazado
al repositorio.

## Estructura principal

```text
AgroVentas/
├── package.json
├── backend/
│   ├── index.js
│   ├── package.json
│   ├── src/
│   └── supabase/
└── frontend/
    └── agroVentas/
        ├── package.json
        └── src/
```

La aplicación Angular está en `frontend/agroVentas`, no directamente
en `frontend`.

## Requisitos

- Git.
- Node.js compatible con Angular 21.2. Se recomienda Node.js 24 LTS.
- npm.
- Acceso a internet.
- Configuración autorizada del proyecto de Supabase utilizado por el equipo.

Comprobar las herramientas:

```powershell
node --version
npm --version
git --version
```

No es necesario instalar Angular CLI globalmente: el proyecto declara
su propia dependencia.

## Entorno de ejecución

El arranque descrito se probó manualmente desde PowerShell en Windows,
con Node.js 24.20.0 y npm 11.19.0.

Si se utiliza WSL, comprobar qué ejecutables de Node y npm se están
usando. No reutilizar ni regenerar dependencias nativas entre Windows
y Linux sin acordar previamente el entorno de trabajo.

## Instalación de dependencias

Ejecutar desde la raíz del repositorio:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend/agroVentas ci
```

- La raíz contiene la dependencia `concurrently`, utilizada para el
  arranque conjunto.
- El backend y el frontend tienen sus propios archivos de dependencias.

Estos comandos pueden modificar dependencias instaladas y archivos
generados. No añadir esos cambios al repositorio indiscriminadamente.

Si `npm ci` informa que `package.json` y `package-lock.json` no coinciden,
detenerse y revisar el lockfile con el equipo. No borrar lockfiles ni
usar opciones de fuerza como solución automática.

No ejecutar `npm audit fix --force` únicamente para quitar advertencias.

## Configuración del backend

Crear un archivo local:

```text
backend/.env
```

Contenido de ejemplo:

```dotenv
PORT=3001
NEXT_PUBLIC_SUPABASE_URL=URL_DEL_PROYECTO
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=CLAVE_PUBLICABLE_DEL_PROYECTO
```

Sustituir los valores de ejemplo por la configuración autorizada.

- No subir `.env` al repositorio.
- No utilizar una clave administrativa o `service_role` como reemplazo
  de la clave publicable.
- No compartir contraseñas, tokens ni credenciales como evidencia.

El frontend utiliza su configuración de Supabase en:

```text
frontend/agroVentas/src/enviroments/enviroment.ts
```

Verificar que frontend y backend utilicen el proyecto previsto.

## Preparación de Supabase

Consultar:

[Configuración de inventario y pedidos](backend/supabase/SETUP.md)

La migración disponible modifica tablas existentes; no representa
por sí sola un esquema completo para crear una base desde cero.

No ejecutarla automáticamente sobre la base compartida. Confirmar
con el responsable de datos qué cambios están aplicados y si existe
autorización para modificar el esquema o sus políticas.

Aunque la aplicación se abra en localhost, sus operaciones pueden
consultar o modificar el Supabase remoto.

## Iniciar frontend y backend juntos

Desde la raíz:

```powershell
npm run dev
```

Direcciones esperadas:

- Frontend: http://localhost:4200/
- Backend: http://localhost:3001/

Mantener abierta la terminal mientras se utiliza la aplicación.

## Iniciar los procesos por separado

Frontend:

```powershell
npm run start:front
```

Backend, desde otra terminal situada en la raíz:

```powershell
npm run start:back
```

Para desarrollo del backend con vigilancia de cambios también existe:

```powershell
npm --prefix backend run dev
```

No iniciar el arranque conjunto mientras siguen activos los procesos
individuales, porque utilizarían los mismos puertos.

El backend está configurado actualmente para admitir el origen
`http://localhost:4200`. No cambiar el puerto del frontend sin revisar
esa configuración.

## Detener los procesos

Utilizar `Ctrl + C` en la terminal correspondiente.

En Windows puede aparecer una confirmación para terminar el trabajo
por lotes. Responder mientras esa pregunta esté activa, no cuando
ya haya vuelto el indicador de PowerShell.

Comprobar si quedan procesos escuchando:

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 3001,4200 } |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

No finalizar procesos desconocidos indiscriminadamente.

## Comprobación básica

Con el backend encendido, abrir:

```text
http://localhost:3001/
```

La ruta principal define esta respuesta:

```json
{
  "mensaje": "API de AgroVentas funcionando"
}
```

La respuesta confirma que la API atiende esa ruta, no que todas las
operaciones con Supabase estén verificadas.

Para probar autenticación, inventario o pedidos, utilizar cuentas
y datos de prueba autorizados.

## Corrección de los scripts de arranque

Se corrigieron las rutas de estas entradas del `package.json` raíz:

- `dev`
- `start:front`
- `install:all`

Ahora apuntan a `frontend/agroVentas`.

Se mantuvo `start:back` sin cambios. La corrección no modifica
dependencias, código de negocio ni configuración de Supabase.

El script `install:all` realiza instalaciones y puede actualizar
lockfiles; no es necesario ejecutarlo cada vez que se inicia la aplicación.

## Validación registrada

Pruebas manuales reportadas desde Windows el 22 de octubre de 2026:

- Angular compiló mediante `npm run start:front`.
- El backend arrancó mediante `npm run start:back`.
- `npm run dev` inició ambos procesos.

Pendiente de registrar para el cierre de la tarea:

- Respuesta de la ruta principal del backend.
- Comprobación de que no quedan procesos después del cierre conjunto.
- Revisión del pull request por otro integrante.

Estas pruebas no equivalen a una validación completa de la aplicación.
