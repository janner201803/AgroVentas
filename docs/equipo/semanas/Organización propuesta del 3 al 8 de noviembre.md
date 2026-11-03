# AgroVentas 2.0: organización propuesta del 3 al 8 de noviembre de 2026

Este documento propone recuperar la trazabilidad pendiente de la semana anterior y organizar un incremento verificable de pedidos e inventario. No constituye un acta de actividades realizadas, una aprobación de la profesora ni la aceptación de las asignaciones por parte del equipo.

## Estado, periodo y responsables

| Campo | Definición |
|---|---|
| Periodo | Del martes 3 al domingo 8 de noviembre de 2026, hora de Colombia. |
| Estado | Propuesta pendiente de validación del equipo. |
| Coordinación | Juan Steban, `@Steban-B`, según la indicación de Juan David y la cuenta identificada entre los colaboradores. |
| Liderazgo técnico | David Santiago, `@LeWonnn`, según la indicación de Juan David y la cuenta identificada entre los colaboradores. |
| Base técnica revisada | Rama `main`, commit [`e87c823`](https://github.com/janner201803/AgroVentas/commit/e87c823e681c0efd803afb17c7e0419f4b09b1c0), consultada el 3 de noviembre de 2026. |
| Ubicación sugerida | `docs/equipo/semanas/2026-11-03.md`. |
| Condición de las fechas | Son hitos internos propuestos, no fechas de entrega impuestas por la profesora. |

La denominación de los dos líderes procede de la confirmación del solicitante. Las responsabilidades adicionales, los revisores y las tareas de este documento deben aceptarse antes de convertirlos en compromisos del equipo.

## Insumos y límites de la revisión

- **Repositorio:** se inspeccionaron el historial de `main`, las ramas remotas, los archivos fuente, la documentación de equipo, las issues y los pull requests disponibles; la aplicación se presenta como un proyecto en desarrollo, no como un sistema terminado ([repositorio y README](https://github.com/janner201803/AgroVentas)).
- **Requisitos:** se utilizó el documento adjunto `Requisitos-agroventas-2.0.docx` como referencia de alcance y reglas esperadas. Su contenido se recuperó como texto y tablas; no se realizó una revisión visual de sus páginas.
- **Historias de usuario:** se utilizó `Historias-de-usuario-agroventas-2.0.docx` para conservar los identificadores HU-01–HU-22 y distinguir el esfuerzo original del trabajo residual de esta semana. La lectura fue de texto y tablas, no una inspección visual del archivo.
- **Recomendaciones docentes:** se leyó el archivo del proyecto `Clases/Recomendaciones de la profesora 29_10.md`, el Markdown de recomendaciones más reciente encontrado. Se tomó como insumo aportado por el usuario, sin atribuir a la profesora aprobaciones no registradas.
- **Verificación local:** se comprobó sintaxis del JavaScript del backend, compilación de producción del frontend y compilación TypeScript de las pruebas. No se ejecutó la aplicación contra Supabase, no se modificó la base de datos y no se verificaron recorridos de extremo a extremo.

No se calculan porcentajes de avance: encontrar código, una issue cerrada o un commit con determinado mensaje no demuestra que una historia cumpla todos sus criterios. Tampoco se interpreta una fecha escrita en el nombre de una migración como prueba de su ejecución.

## Recuperación documental de la semana anterior

Se propone registrar por separado el periodo del 26 de octubre al 1 de noviembre y los cambios del 2 de noviembre, que preceden a este plan. La recuperación debe basarse en evidencias existentes y testimonios identificados, sin inventar reuniones, encargos, pruebas o acuerdos retroactivos.

La documentación semanal encontrada en el repositorio corresponde al plan del 19 al 25 de octubre; ese archivo es un borrador organizativo y no acredita la ejecución de las tareas que enumera ([plan anterior](https://github.com/janner201803/AgroVentas/blob/main/docs/equipo/semanas/2026-10-19.md)).

| Evidencia revisada | Qué permite registrar | Qué no debe afirmarse todavía |
|---|---|---|
| Historial de inventario y pedidos, con cambios hasta el 1 de noviembre y nuevas correcciones el 2 de noviembre ([historial del repositorio](https://github.com/janner201803/AgroVentas), [corrección de pedidos e inventario](https://github.com/janner201803/AgroVentas/commit/c9befcc4fdb5af1b9ce7cc78e429b92ccba6619b)). | Hubo evolución técnica aunque no exista un plan semanal equivalente al anterior. | Que el equipo hubiera acordado previamente las asignaciones de este documento. |
| Catálogo, acumulación de existencias y ajustes al registro de pedidos en el commit `c9befcc` ([cambios del commit](https://github.com/janner201803/AgroVentas/commit/c9befcc4fdb5af1b9ce7cc78e429b92ccba6619b)). | Existe código para listar productos y agregar existencias de productos del catálogo. | Que exista un CRUD completo de productos, que se puedan borrar productos o que todos los roles estén validados. |
| Reserva de stock e historial de pedidos en `e87c823`, del 2 de noviembre ([cambios del commit](https://github.com/janner201803/AgroVentas/commit/e87c823e681c0efd803afb17c7e0419f4b09b1c0)). | Se incorporaron una operación SQL de reserva y cambios para consultar pedidos del usuario. | Que las migraciones estén aplicadas en el entorno compartido o que la concurrencia ya haya sido probada. |
| Recuperación de contraseña e inactividad visibles en el servicio de autenticación ([servicio de autenticación](https://github.com/janner201803/AgroVentas/blob/main/frontend/agroVentas/src/app/core/services/auth.service.ts)). | Hay implementación que debe incluirse en la regresión del acceso. | Que un correo de recuperación llegue correctamente o que el cierre de sesión se haya comprobado en todos los escenarios. |
| PR de logout marcado como cerrado, no fusionado mediante ese PR ([PR #4](https://github.com/janner201803/AgroVentas/pull/4)). | El estado del PR debe distinguirse de la presencia del código en `main`. | Que “PR cerrado” equivalga a “PR fusionado” o a “funcionalidad aprobada”. |

### Registro de recuperación por completar

Cada autor o responsable debe completar una fila con información comprobable. Si no hay evidencia de una actividad, debe registrarse como “no documentada”, no como “realizada”.

| Periodo o fecha | Cambio o actividad | Autor o responsable confirmado | Commit, PR, issue o documento | Prueba y resultado | Pendiente |
|---|---|---|---|---|---|
| 26 de octubre–1 de noviembre | Completar a partir del historial y confirmación de los integrantes. | Por confirmar. | Añadir enlace exacto. | No documentada hasta adjuntar evidencia. | Identificar regresiones o trabajo residual. |
| 2 de noviembre | Correcciones de pedidos/inventario y reserva de stock. | Confirmar quién implementó y quién revisó cada cambio. | `c9befcc` y `e87c823`, enlazados arriba. | La revisión de código no sustituye la prueba funcional. | Verificar migraciones y casos concurrentes. |

**Responsabilidad de recuperación:** coordinación consolida el registro, los autores aportan sus evidencias y liderazgo técnico valida la descripción de los cambios. La recuperación no debe retrasar el registro diario de la semana actual.

## Diagnóstico para decidir el alcance

### Avances y brechas funcionales

| Área / historias relacionadas | Estado observado en el código | Trabajo que debe verificarse o completarse |
|---|---|---|
| Acceso, HU-01–HU-06 | Hay autenticación con Supabase y lógica para recuperación e inactividad ([servicio de autenticación](https://github.com/janner201803/AgroVentas/blob/main/frontend/agroVentas/src/app/core/services/auth.service.ts)). | Probar cuentas y roles autorizados, recuperación y vencimiento de sesión sin exponer credenciales. |
| Creación y consulta de pedidos, HU-07–HU-08 | El servicio crea pedidos, consulta horarios y lista pedidos por usuario ([servicio de pedidos](https://github.com/janner201803/AgroVentas/blob/main/backend/src/application/services/PedidoService.js)). | Verificar reserva, persistencia, aislamiento entre clientes, recarga e historial vacío. |
| Inventario, HU-17 | Se incorporaron catálogo y suma de existencias, lo que no equivale por sí mismo a completar toda la historia administrativa ([corrección de inventario](https://github.com/janner201803/AgroVentas/commit/c9befcc4fdb5af1b9ce7cc78e429b92ccba6619b)). | Comprobar acceso administrativo, unidades, acumulación, validaciones y actualización tras pedidos. |
| Consulta de inventario, HU-18, y consistencia con HU-07/HU-17 | La migración define reserva transaccional, controla stock y restringe horarios; además advierte que no reserva automáticamente los pedidos anteriores ([migración de reserva](https://github.com/janner201803/AgroVentas/blob/main/backend/supabase/migrations/20261102_reserva_stock_pedidos.sql)). | Verificar consulta de disponibilidad, búsqueda y actualización; probar concurrencia y fallos como controles transversales, no como una historia distinta. |
| Resto del alcance, HU-09–HU-16 y HU-19–HU-22 | Los cambios recientes consultados se concentran en inventario, pedidos y acceso, sin aportar evidencia suficiente para dar por terminadas esas otras historias ([repositorio](https://github.com/janner201803/AgroVentas), [último incremento](https://github.com/janner201803/AgroVentas/commit/e87c823e681c0efd803afb17c7e0419f4b09b1c0)). | Mantenerlas en el backlog con estado pendiente de evaluación; no confundirlas con el incremento acotado de esta semana. |

### Discrepancias que requieren decisión

- **Horario y capacidad de entrega:** el código ofrece turnos de 08:00 a 16:00 y la migración restringe la ocupación de un turno por fecha; se debe confirmar si esa capacidad corresponde al negocio y a qué estados de pedido aplica ([servicio de pedidos](https://github.com/janner201803/AgroVentas/blob/main/backend/src/application/services/PedidoService.js), [restricciones SQL](https://github.com/janner201803/AgroVentas/blob/main/backend/supabase/migrations/20261102_reserva_stock_pedidos.sql)).
- **Unidad y precio por producto:** la corrección incluye un catálogo y precios asociados a la operación de inventario; antes de cerrar HU-17 debe comprobarse que nombre, precio y unidad corresponden al mismo producto y a lo establecido en los requisitos ([cambios de inventario y catálogo](https://github.com/janner201803/AgroVentas/commit/c9befcc4fdb5af1b9ce7cc78e429b92ccba6619b)).
- **Reserva frente a descuento:** la función SQL disminuye `inventario.cantidad` al crear el pedido y registra la reserva; también contiene un trigger que devuelve stock al cancelar/rechazar y vuelve a reservar al reactivar, lo cual debe probarse sin confundir esos mecanismos con un flujo administrativo completo en la interfaz ([migración de reserva](https://github.com/janner201803/AgroVentas/blob/main/backend/supabase/migrations/20261102_reserva_stock_pedidos.sql)).
- **Identificación administrativa:** el frontend contiene un correo administrativo fijo; liderazgo técnico debe revisar su correspondencia con las comprobaciones del backend y la base de datos, y definir si se mantiene provisionalmente o se sustituye por un esquema de roles aprobado ([servicio de autenticación](https://github.com/janner201803/AgroVentas/blob/main/frontend/agroVentas/src/app/core/services/auth.service.ts)).
- **Versiones de requisitos e historias:** se debe conservar el identificador de cada historia y registrar cualquier diferencia entre los dos documentos adjuntos y el comportamiento actual. Ninguna regla codificada reemplaza automáticamente una regla del negocio.

### Verificación técnica realizada el 3 de noviembre

Los resultados siguientes proceden de la ejecución local sobre la copia del commit de referencia. Son comprobaciones de compilación y sintaxis, no resultados de pruebas de negocio en Supabase.

| Comprobación | Resultado local | Implicación para la semana |
|---|---|---|
| `node --check` sobre los `.js` del backend | Sin errores de sintaxis detectados. | Aún faltan pruebas de comportamiento, API y base de datos. |
| Instalación del frontend con `npm ci --ignore-scripts --no-audit --no-fund` | Completada; Node 20 del entorno produjo advertencias de incompatibilidad con dependencias. | Acordar una versión compatible y registrarla antes de comparar resultados entre integrantes. |
| Compilación de producción con Node 22 mediante `npx --yes --package=node@22 -- node node_modules/@angular/cli/bin/ng.js build` | Completada; advertencias de presupuesto CSS en inventario, login, registro e inicio. | No confundir compilación exitosa con aceptación funcional. |
| `./node_modules/.bin/tsc --noEmit -p tsconfig.spec.json` desde el frontend | Falló con cinco errores TS2339: `unidadSugerida` no existe en `Inventario`, líneas 26–28, 33 y 38 del spec. | Corregir primero las pruebas desactualizadas; no reportar “suite aprobada”. |
| Pruebas unitarias completas, integración y E2E | No ejecutadas. | Deben ejecutarse con datos y entorno de prueba autorizados. |

El spec que referencia `unidadSugerida` permanece en el repositorio y permite localizar el desajuste observado al compilar las pruebas ([spec de inventario](https://github.com/janner201803/AgroVentas/blob/main/frontend/agroVentas/src/app/pages/inventario/inventario.spec.ts)). El README recomienda una versión compatible de Node y advierte sobre las diferencias de entorno, por lo que no debe atribuirse una advertencia del entorno local a un defecto funcional del sistema ([instrucciones de ejecución](https://github.com/janner201803/AgroVentas)).

## Aplicación de las recomendaciones de la profesora

El archivo `Recomendaciones de la profesora 29_10.md` contiene una transcripción con fragmentos ambiguos: no permite fijar por sí sola los horarios reales ni todas las unidades de venta. Sus observaciones claras incluyen identificar al responsable de cada historia, entregar funcionalidad y no solo una base de datos, distinguir aceptación del cliente de escenarios técnicos, consultar al usuario real y corregir catálogo, horarios y navegación.

| Recomendación del insumo docente | Aplicación propuesta | Evidencia de cumplimiento |
|---|---|---|
| Añadir el campo de responsable. | Cada historia priorizada tendrá una persona responsable funcional y colaboradores explícitos. | Matriz semanal y campo responsable del backlog. |
| Entregar historias funcionales, no solamente componentes o una BD. | El responsable articula datos, API, interfaz y prueba del recorrido con sus apoyos. | Demostración de la función desde la perspectiva del usuario. |
| No confundir criterios de aceptación del cliente con escenarios BDD. | Redactar criterios en lenguaje de negocio y conservar los escenarios técnicos como pruebas separadas. | Criterios entendibles por propietario, empleado o cliente y validación registrada. |
| Consultar horarios y operación reales. | Preguntar días, franjas, anticipación y capacidad; no asumir horario de oficina ni un pedido por turno. | Respuesta del usuario real y decisión documentada. |
| Limitar errores en productos y unidades. | Usar catálogo controlado y aplicar las unidades permitidas según cada producto. | Pruebas de selección y validación acordadas con el negocio. |
| Diferenciar creación y consulta de pedidos. | Evitar que consultar abra solamente el formulario de creación; permitir comprobar qué pedido quedó registrado. | Historial propio y confirmación de registro verificables. |
| Priorizar consulta en la interfaz de inventario. | Mostrar primero existencias y ofrecer la entrada como acción secundaria, según validación de la interfaz. | Revisión del recorrido de consulta antes del formulario de entrada. |

La distribución del trabajo, el papel articulador del liderazgo técnico, los hitos y la reestimación residual son decisiones organizativas propuestas en este documento. No se atribuyen a la profesora como instrucciones literales de la transcripción.

Los documentos adjuntos sirven como base para las historias y sus estimaciones originales, pero el código ya contiene trabajo implementado. Por eso las horas originales no se convierten en compromisos de esta semana ni se reparte una suma global sin conocer disponibilidad.

## Objetivo y alcance semanal

**Objetivo propuesto:** dejar demostrable el recorrido “administrador agrega existencias → cliente consulta disponibilidad → cliente registra un pedido → se reserva stock → cliente consulta su historial”, con validaciones y evidencias reproducibles. El objetivo solo se considera alcanzado cuando se ejecuten sus pruebas en un entorno autorizado.

- **Prioridad principal:** estabilizar HU-07, HU-08, HU-17 y HU-18, con controles transversales de cantidades, stock, permisos y fechas. El incremento puede ser parcial: no se cierra una historia si faltan criterios del documento adjunto.
- **Condición de entrada:** confirmar requisitos, reglas de negocio, capacidad del equipo y disponibilidad del entorno de prueba antes de ampliar el trabajo técnico.
- **Regresión obligatoria:** comprobar acceso y permisos de las cuentas necesarias para el recorrido, además de no romper las funciones existentes de autenticación.
- **Fuera del compromiso base:** no iniciar simultáneamente todos los módulos de ventas, facturación, crédito, cartera, reportes o flujos de despacho. Tampoco introducir cambios destructivos en datos reales para completar una demostración.
- **Reserva de capacidad:** si una dependencia no se resuelve, se reduce el alcance y se documenta el bloqueo; no se trasladan silenciosamente todas las tareas al líder técnico.

### Responsables funcionales por historia

Las asignaciones siguientes son propuestas que deben confirmar los integrantes. Ser responsable de una historia significa asegurar sus criterios y evidencias; no significa implementarla sin ayuda ni poder aprobar unilateralmente las reglas del negocio.

| Historia | Resultado acotado de esta semana | Responsable propuesto | Apoyo | Revisión |
|---|---|---|---|---|
| HU-07: Crear pedido desde el portal | Registrar pedido válido con disponibilidad consistente y errores comprensibles. | `@miguelararat` | `@jeissonnarvaez-design` en datos; `@melpl1310` en interfaz. | `@LeWonnn` y QA independiente. |
| HU-08: Consultar estado de pedidos | Mostrar al cliente únicamente sus pedidos con estado, datos, recarga y manejo de errores. | `@Juanse0818` | `@melpl1310` en presentación; `@JJHG-p` en criterios. | `@LeWonnn` y `@InfinixCox`. |
| HU-17: Registrar entrada de inventario | Agregar existencias de catálogo con permisos y validaciones; verificar lo que falte de la historia completa. | `@janner201803` | `@jeissonnarvaez-design` en migraciones; `@melpl1310` en UI. | `@LeWonnn` y `@InfinixCox`. |
| HU-18: Consultar inventario | Consultar disponibilidad por producto/unidad, búsqueda y actualización; distinguir comprometido y disponible. | `@sebastianocampo-lab` | Responsables de HU-07 y HU-17. | `@LeWonnn` y `@InfinixCox`. |

### Trazabilidad y aceptación propuesta para validar con el usuario real

Estos criterios se formulan en lenguaje de usuario y todavía requieren validación. Los casos técnicos de la sección de pruebas son complementarios y no sustituyen esa aceptación.

| Historia / requisitos adjuntos | Criterio de aceptación propuesto | Límites que impiden declarar la historia completa sin revisión |
|---|---|---|
| HU-07 / RF-05 | Como cliente, puedo seleccionar productos y cantidades permitidas, conocer el valor estimado y comprobar que mi pedido quedó registrado como pendiente para una entrega disponible. | Revisar pedido con varios productos, datos requeridos y visibilidad al personal; el código actual no demuestra por sí solo todos esos criterios. |
| HU-08 / RF-06 y RF-08 | Como cliente, puedo consultar mis pedidos con fecha, productos, cantidades, valor y estado actualizado sin acceder a pedidos ajenos. | El cambio real de estado por el personal depende de HU-12; consultar un historial de pedidos pendientes no demuestra todo el ciclo. |
| HU-17 / RF-15 | Como propietario o empleado autorizado, puedo registrar una entrada con sus datos y comprobar tanto el aumento de existencias como el movimiento registrado. | Confirmar permiso del empleado frente al acceso administrativo actual y revisar fecha, responsable, proveedor, notas y registro de movimiento. |
| HU-18 / RF-16 y RF-17 | Como propietario o empleado autorizado, puedo localizar un producto, conocer disponibilidad y última actualización y advertir un nivel bajo conforme al umbral acordado. | Revisar búsqueda/categoría, existencias comprometidas, alertas y efecto de ventas; sin el flujo de ventas probado no se cierra ese criterio de la historia. |

Como referencia, las estimaciones originales del archivo adjunto son HU-07: 11 h, HU-08: 4 h, HU-17: 7 h y HU-18: 5 h, todas horas-persona preliminares. No son estimaciones del esfuerzo restante ni un compromiso automático de 27 horas para esta semana.

### Distribución propuesta del equipo

| Cuenta | Encargo principal | Entregable revisable |
|---|---|---|
| `@Steban-B` | Coordinación, aceptación de asignaciones, capacidad y seguimiento. | Plan acordado, recuperación de la semana anterior y balance final. |
| `@LeWonnn` | Liderazgo técnico, integración y resolución de dependencias. | Decisiones técnicas, revisión de PR y diagnóstico de bloqueos. |
| `@miguelararat` | HU-07 y consistencia de reserva al crear pedidos. | Ajustes necesarios y casos de éxito, rechazo y concurrencia. |
| `@janner201803` | HU-17 y conexión catálogo/inventario. | Flujo administrativo verificado y pendientes explícitos de la historia. |
| `@Juanse0818` | HU-08 e integración de consulta del cliente. | Historial propio, persistencia tras recarga y manejo de errores. |
| `@sebastianocampo-lab` | HU-18 y controles transversales acordados con sus responsables. | Consulta de disponibilidad, búsqueda/actualización y pruebas de consistencia. |
| `@melpl1310` | Interfaz de inventario/pedidos y ajuste de pruebas del frontend. | UI coherente, spec actualizado y regresión de acceso. |
| `@jeissonnarvaez-design` | Datos, migraciones y entorno autorizado. | Registro de migraciones, configuración revisada y datos de prueba sin secretos. |
| `@InfinixCox` | QA y trazabilidad de resultados. | Matriz ejecutada, defectos reproducibles y evidencias independientes. |
| `@JJHG-p` | Requisitos, criterios y documentación de decisiones de negocio. | Trazabilidad requisito–HU–issue–prueba y preguntas pendientes registradas. |

El plan anterior reportaba once integrantes pero solo identificaba diez cuentas; la revisión de colaboradores también identificó diez cuentas, por lo que no se inventa una undécima asignación ([antecedente del equipo](https://github.com/janner201803/AgroVentas/blob/main/docs/equipo/roles.md)). Coordinación debe confirmar el censo actual y redistribuir trabajo si existe otro integrante o alguna persona no está disponible.

## Backlog operativo propuesto

Los códigos SEM son identificadores locales del plan, no números de issues ya creadas. Antes de trabajar, coordinación y la persona responsable deben registrar horas disponibles, esfuerzo restante y aceptación; la fecha objetivo queda condicionada a esa validación.

| ID | Trabajo y criterio de cierre | Responsable propuesto | Dependencia | Objetivo interno |
|---|---|---|---|---|
| SEM-01 | Recuperar avances anteriores con enlaces y vacíos explícitos; no inventar actas. | `@Steban-B`, apoyo de autores. | Confirmaciones del equipo. | 3–4 nov. |
| SEM-02 | Revisar HU-07, HU-08, HU-17 y HU-18 contra requisitos; registrar responsables y preguntas de negocio. | `@JJHG-p` | SEM-01 y documentos adjuntos. | 3–4 nov. |
| SEM-03 | Registrar entorno y estado de las migraciones; preparar usuarios y datos de prueba autorizados. | `@jeissonnarvaez-design` | Acceso autorizado y revisión de `@LeWonnn`. | 4 nov. |
| SEM-04 | Corregir las referencias obsoletas de los specs, compilar y ejecutar pruebas del frontend; conservar pruebas significativas. | `@melpl1310` | Revisión del comportamiento actual. | 4–5 nov. |
| SEM-05 | Verificar HU-17: acumulación, unidades, precios y rechazo a no administradores; corregir defectos encontrados. | `@janner201803` | SEM-02 y SEM-03. | 5 nov. |
| SEM-06 | Verificar HU-07 y reserva: éxito, stock insuficiente, concurrencia y ausencia de reservas huérfanas. | `@miguelararat` | SEM-02 y SEM-03. | 5–6 nov. |
| SEM-07 | Verificar HU-08: aislamiento de clientes, recarga, orden y estados de error/vacío; ajustar según criterios. | `@Juanse0818` | SEM-03 y pedidos de prueba. | 5–6 nov. |
| SEM-08 | Verificar HU-18: consulta, búsqueda, disponibilidad y actualización; revisar controles transversales y registrar criterios aún pendientes. | `@sebastianocampo-lab` | SEM-02, SEM-05 y SEM-06. | 6 nov. |
| SEM-09 | Ejecutar QA independiente del recorrido completo; registrar defectos, correcciones y repetición. | `@InfinixCox` | SEM-04 a SEM-08. | 6–7 nov. |
| SEM-10 | Revisar integración, regresión de acceso y PR; no fusionar con fallos críticos pendientes. | `@LeWonnn` | Evidencia técnica y SEM-09. | 7 nov. |
| SEM-11 | Consolidar demostración y balance: aceptado, parcial, bloqueado o no iniciado por historia. | `@Steban-B`, apoyo de `@JJHG-p`. | SEM-09 y SEM-10. | 8 nov. |

### Estimación y capacidad antes de comprometer

Cada responsable propone las horas restantes de su tarea con apoyo de liderazgo técnico y explicita las dependencias. Coordinación suma las horas disponibles, reserva tiempo de pruebas/revisión y recorta trabajo si el total no cabe; no se supone dedicación completa de ningún estudiante.

| Campo por completar en cada issue | Regla |
|---|---|
| Estimación original de la HU | Copiar del documento adjunto, sin alterar su significado. |
| Estimación residual | Acordar lo que falta realmente para esta semana; no repetir toda la estimación original. |
| Disponibilidad aceptada | Registrar horas del responsable y apoyos, sin contar dos veces el mismo tiempo. |
| Incertidumbre | Indicar accesos, decisiones y migraciones pendientes. |
| Reestimación | Si cambia el alcance o aparece un bloqueo, dejar fecha, motivo y nuevo acuerdo. |

## Cronograma y seguimiento

| Fecha | Foco propuesto | Evidencia esperada |
|---|---|---|
| Martes 3 | Validar líderes, disponibilidad y responsables; iniciar recuperación documental y revisión de historias. | Aceptaciones, límites de alcance y tareas listas para estimar. |
| Miércoles 4 | Cerrar dudas prioritarias, confirmar entorno y migraciones, reparar la base de pruebas. | Decisiones o bloqueos explícitos; pruebas que vuelven a compilar. |
| Jueves 5 | Estabilizar inventario, creación y consulta de pedidos. | PR pequeños, pruebas por historia y evidencias de datos de prueba. |
| Viernes 6 | Completar validaciones y ejecutar integración/QA. | Casos de concurrencia, permisos, fechas y stock registrados. |
| Sábado 7 | Corregir defectos, repetir casos y revisar integración. | Resultados repetidos, revisión técnica y lista de pendientes. |
| Domingo 8 | Demostrar lo aceptado y registrar el cierre real. | Balance semanal y backlog residual, sin afirmar completitud no comprobada. |

Se propone una actualización diaria breve en el tablero: resultado anterior, siguiente tarea y bloqueo. Los bloqueos que impidan continuar se comunican a coordinación y liderazgo técnico el mismo día, sin esperar al cierre semanal.

## Plan mínimo de pruebas

Los resultados iniciales de todos los casos siguientes son **pendientes de ejecución**. Deben usarse datos de prueba y cuentas autorizadas; las capturas y los logs no deben mostrar contraseñas, tokens ni información personal innecesaria.

| Caso | Historia | Comprobación esperada |
|---|---|---|
| P-01 | HU-17 | El administrador agrega existencias y repetir la operación suma la cantidad al producto correcto. |
| P-02 | HU-17 / HU-18 | Cero, negativos, valores no numéricos y fracciones en productos por unidad se rechazan según reglas confirmadas. |
| P-03 | HU-17 | Un cliente y una solicitud sin autenticar no pueden agregar existencias, incluso llamando directamente a la API. |
| P-04 | HU-07 | Un pedido válido persiste, reserva la cantidad correcta y actualiza la disponibilidad observada. |
| P-05 | HU-07 / HU-18 | Un pedido superior al disponible se rechaza sin dejar pedido ni reserva parcial. |
| P-06 | HU-07 / HU-18 | Dos solicitudes simultáneas sobre el mismo stock no generan sobreventa; verificar la consistencia tras ambas respuestas. |
| P-07 | HU-07 / HU-18 | Fecha pasada, hora vencida, horario inválido y turno ocupado se comportan según la regla validada. |
| P-08 | HU-08 | El cliente ve su historial tras recargar y no obtiene pedidos de otra cuenta. |
| P-09 | HU-08 | Un usuario sin pedidos ve un estado vacío útil; los errores de consulta no se presentan como un historial vacío exitoso. |
| P-10 | Regresión de acceso | Login, recuperación e inactividad mantienen el acceso esperado y protegen rutas/operaciones. |
| P-11 | Datos / HU-18 | Se documenta cómo se tratan pedidos anteriores a la migración y se comprueba que no aparecen reservas retroactivas no previstas. |
| P-12 | Entorno | Se reproducen instalación, build y pruebas con versiones registradas; las advertencias se evalúan por separado de los errores. |
| P-13 | HU-18 | Propietario/empleado autorizado consulta y busca productos con disponibilidad y actualización; se verifican comprometido, disponible y alerta según reglas confirmadas. |
| P-14 | HU-17 | La entrada conserva fecha, responsable y datos exigidos por RF-15, con evidencia del movimiento y permiso del empleado según decisión validada. |
| P-15 | Datos / HU-07 | En entorno de prueba autorizado, cancelar/rechazar devuelve la reserva una sola vez y reactivar exige stock suficiente; no se afirma que exista una interfaz completa para hacerlo. |

Para cada caso se registra: versión probada, entorno, fecha, ejecutor, datos de entrada, resultado esperado, resultado obtenido y evidencia. Si falla, se crea o vincula un defecto y se conserva también la evidencia de su repetición después de corregirlo.

## Reglas para GitHub y revisión

Se propone mantener la trazabilidad en issues y PR, sin dar por creadas ni asignadas las tareas de esta propuesta. La documentación anterior ya distingue entre organización propuesta y ejecución real, distinción que debe conservarse esta semana ([roles y acuerdos](https://github.com/janner201803/AgroVentas/blob/main/docs/equipo/roles.md), [plan anterior](https://github.com/janner201803/AgroVentas/blob/main/docs/equipo/semanas/2026-10-19.md)).

- **Antes de abrir nuevas issues:** revisar las existentes, reutilizar las pertinentes y aclarar si un cierre previo tuvo evidencia; evitar duplicar recuperación de contraseña u otras tareas históricas.
- **Contenido mínimo de issue:** objetivo, HU/requisito, alcance, responsable aceptado, apoyos, esfuerzo residual, dependencias, criterios, revisor y evidencia.
- **Estados propuestos:** pendiente de aclaración → listo → en curso → en revisión → terminado; “bloqueado” se identifica expresamente con motivo y acción necesaria.
- **Ramas e integración:** liderazgo técnico acuerda una base actualizada antes de abrir nuevas ramas; no se usan `main` y `desarrollo` como si fueran equivalentes ni se reinician ramas compartidas para forzar esa equivalencia.
- **Pull requests:** un resultado pequeño por PR, issue vinculada, instrucciones de prueba y revisión por alguien diferente del autor; David Santiago interviene en cambios de integración o reglas transversales.
- **Cierre verificable:** cerrar una issue requiere evidencia de sus criterios; cerrar un PR sin fusionar no equivale a integrar el trabajo.
- **Protección de datos:** no versionar archivos de entorno, claves de servicio, tokens ni capturas con datos sensibles; no borrar inventario o pedidos reales para facilitar pruebas.

### Plantilla breve de issue

```markdown
## Objetivo
Resultado concreto y HU/requisito relacionado:

## Alcance
Incluye:
No incluye:

## Responsables y capacidad
Responsable que acepta:
Apoyos:
Revisor:
Estimación residual y disponibilidad:

## Dependencias y decisiones
Bloqueos:
Reglas pendientes de validar:

## Criterios de aceptación
- [ ] Resultado observable y prueba asociada.
- [ ] Validaciones y permisos aplicables comprobados.

## Evidencia
Commit o PR:
Versión y entorno:
Pruebas ejecutadas y resultados:
Pendientes:
```

## Riesgos y decisiones pendientes

| Riesgo o decisión | Acción propuesta | Responsable |
|---|---|---|
| Capacidad desconocida y posible concentración de trabajo. | Confirmar disponibilidad, limitar trabajo simultáneo y redistribuir antes de comprometer fechas. | Coordinación. |
| Reglas de horario, unidad, precio o capacidad no validadas. | Registrar pregunta y respuesta con fecha y persona que valida; no cerrar criterios ambiguos. | Requisitos y coordinación, con apoyo técnico. |
| Migraciones presentes pero entorno sin verificar. | Registrar versión aplicada y probar en entorno autorizado antes de demostrar. | Datos y liderazgo técnico. |
| Pruebas desactualizadas o cobertura insuficiente. | Reparar la compilación, ejecutar casos relevantes y añadir evidencia de regresión. | Interfaz, validaciones y QA. |
| Reserva incompleta respecto a futuros flujos de cancelación/despacho. | Documentar el límite actual y conservar el trabajo posterior en el backlog; no simularlo como terminado. | HU-07 y liderazgo técnico. |
| Aprobación de código sin comprobación funcional. | Separar revisión técnica, ejecución de pruebas y aceptación del criterio. | Revisor y QA. |
| Dependencia de un integrante o acceso no disponible. | Registrar sustitución o reducir alcance explícitamente; no compartir secretos para desbloquearse. | Coordinación y liderazgo técnico. |

## Criterios de cierre semanal

La semana se cierra con un balance honesto aunque el objetivo no se alcance por completo. Solo una historia que cumpla todos sus criterios acordados puede registrarse como terminada; una verificación parcial se mantiene parcial.

- [ ] Líderes y responsabilidades confirmados; cambios de asignación registrados.
- [ ] Semana anterior recuperada con evidencias o vacíos explícitos.
- [ ] HU priorizadas vinculadas a requisitos, responsables, tareas y pruebas.
- [ ] Reglas de negocio validadas o bloqueos identificados sin asumir respuestas.
- [ ] Entorno, versiones y estado de migraciones documentados.
- [ ] Pruebas del frontend corregidas, compiladas y ejecutadas con resultado registrado.
- [ ] Casos prioritarios de inventario, reserva, historial y permisos ejecutados.
- [ ] Defectos críticos resueltos y repetidos, o incremento marcado como no aceptado.
- [ ] PR revisados e integración real identificada mediante commit.
- [ ] Balance publicado con pendientes y responsables para el siguiente ciclo.

### Balance que debe completarse el 8 de noviembre

| Historia / frente | Estado real | Evidencia | Pendiente y siguiente responsable |
|---|---|---|---|
| Recuperación documental | Pendiente al elaborar esta propuesta. | Completar. | Completar. |
| HU-07 | Pendiente de validación funcional. | Completar. | Completar. |
| HU-08 | Pendiente de validación funcional. | Completar. | Completar. |
| HU-17 | Pendiente de validación funcional. | Completar. | Completar. |
| HU-18, alcance parcial | Pendiente de validación funcional. | Completar. | Completar. |
| Pruebas, integración y acceso | Pendiente de ejecución completa. | Completar. | Completar. |

## Incorporación propuesta al repositorio

Este archivo puede subirse mediante un PR documental a `docs/equipo/semanas/2026-11-03.md`. El PR debe indicar que se trata de una propuesta, pedir confirmación de responsables y conservar el diagnóstico separado del trabajo aún no ejecutado.

Después de la validación, se propone añadir su enlace al README y actualizar los roles vigentes sin borrar la información histórica del periodo anterior. Publicar el documento no equivale a crear las issues, aceptar las tareas ni cerrar historias; esas acciones deben registrarse de forma independiente.
