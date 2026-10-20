# AgroVentas 2.0 — Roles y acuerdos del equipo

## Estado y alcance

Borrador de organización para validar con el equipo. No acredita aprobación de la profesora ni ejecución de tareas.

- Periodo inicial propuesto: 19 al 25 de octubre de 2026, hora de Colombia.
- Equipo reportado: 11 integrantes.
- Cuentas suministradas para este plan: 10. Falta identificar al integrante restante.
- Melani Parra en coordinación y Jeison en liderazgo técnico: asignaciones docentes reportadas por Juan David.
- Los demás roles, revisores y tareas son propuestas; deben confirmarse con cada persona.
- Administradores del Project, según lo confirmado por Juan David: Janner, Juan David, Jeison y Melani. Los demás tienen Write en el Project. Estos permisos no equivalen a roles académicos ni acreditan acceso al repositorio.

## Dónde consultar el trabajo

- [Asignaciones y tareas del 19 al 25 de octubre](semanas/2026-10-19.md).
- GitHub Project enlazado al repositorio: seguimiento diario de tareas y estados. La URL exacta todavía no se incorporó a estos documentos.
- Issues del repositorio: criterios, comentarios, bloqueos y evidencias.

Este documento explica responsabilidades estables. Las asignaciones de cada periodo se conservan en archivos separados; no se reemplaza el historial de semanas anteriores.

## Responsabilidades

| Rol | Responsabilidad | Entregable mínimo | Límite |
| --- | --- | --- | --- |
| Coordinación general — CEO académico | Acordar objetivo, prioridades, disponibilidad y seguimiento. Comunicar avances. | Plan y cierre semanal revisados por el equipo. | No decide sola el alcance, las tecnologías o las calificaciones. |
| Liderazgo técnico | Coordinar contratos, dependencias y decisiones técnicas. Orientar la integración. | Acuerdos técnicos y dudas pendientes registradas. | No realiza ni aprueba personalmente todo el trabajo. |
| Auditoría de avance y trazabilidad | Contrastar lo reportado con evidencia y dar seguimiento a hallazgos. | Informe que distinga verificado, parcial y pendiente. | No es una auditoría externa certificada ni reemplaza a QA. No revisa su propio trabajo como único verificador. |
| Requisitos y reglas de negocio | Aclarar actores, permisos, reglas y criterios de aceptación. | Requisitos candidatos y preguntas por resolver. | No convierte propuestas históricas en requisitos aprobados. |
| UX e interfaz | Revisar claridad de navegación, formularios y mensajes. | Observaciones justificadas del recorrido del usuario. | Distingue inspección de código de observación de pantallas ejecutadas. |
| Frontend — autenticación | Coordinar sesión, login, registro y comunicación autenticada. | Recorrido de autenticación y pendientes documentados. | No publica claves privadas ni modifica proveedores sin acuerdo. |
| Frontend — pedidos | Coordinar formulario, presentación de productos y respuestas del pedido. | Recorrido y campos del formulario contrastados con la API. | No define unilateralmente precios o políticas de inventario. |
| Backend | Coordinar endpoints, validaciones y casos de uso. | Contrato observado y operaciones revisadas. | No cambia contratos sin comunicarlo al frontend. |
| Datos y Supabase | Coordinar esquema, políticas y cambios reproducibles. | Documentación de datos y configuración sin secretos. | No cambia datos ni políticas reales sin autorización y revisión. |
| QA — pruebas | Diseñar y ejecutar escenarios, registrar defectos y verificar correcciones. | Resultados con pasos, esperado, obtenido y evidencia. | No marca una prueba como aprobada si no pudo ejecutarla. |
| Integración y documentación | Coordinar unión de cambios e instrucciones para ejecutar el proyecto. | Guía de arranque y estado de la integración. | No fusiona cambios sin el acuerdo de revisión del equipo. |

## Reglas de trabajo propuestas

1. Una persona coordina cada tarea; otras pueden ayudar. El rol no crea exclusividad sobre una carpeta.
2. Todos reciben una tarea básica verificable. No se exige implementar una funcionalidad compleja solo para demostrar participación.
3. Cada tarea contiene objetivo, alcance, criterios, responsable, revisor y evidencia.
4. Los responsables registran su disponibilidad y bloqueos. La coordinación acuerda la fecha de entrega antes de la siguiente revisión; no hay una fecha docente inferida en este plan.
5. Un commit, una carpeta o una pantalla no prueban por sí solos que un recorrido integrado funcione.
6. No se comparten contraseñas, tokens, claves privadas, archivos .env ni datos personales de clientes como evidencia.
7. No se hacen cambios funcionales, migraciones ni cambios de políticas de Supabase para cumplir las tareas de reconocimiento de esta semana.
8. Si se necesita un cambio de código, se abre una tarea separada y se acuerdan su revisión y rama.
9. Las revisiones son de otra persona. La auditoría de Juan David será revisada por Melani.
10. Los cuatro administradores acuerdan cambios estructurales del Project para no crear campos, estados o automatizaciones contradictorios.

## Estados

- Por aclarar: falta información para realizar el trabajo.
- Pendiente: tarea entendida, todavía no iniciada.
- En curso: trabajo activo.
- En revisión: evidencia entregada, pendiente de comprobación.
- Terminado: criterios cumplidos y revisión registrada.

Un bloqueo se registra en el issue, indicando qué impide avanzar y qué ayuda se necesita. Si una prueba no se ejecuta, queda como pendiente, no como aprobada.

## Rotación

La semana siguiente se crea un nuevo archivo en `docs/equipo/semanas/` y se añade su enlace en esta sección. Se conserva el anterior.

Antes de cambiar de rol, cada persona registra:

```text
Qué recibí:
Qué avancé:
Qué queda pendiente:
Qué bloqueos existen:
Dónde están las evidencias:
```

La rotación no cambia automáticamente responsables de issues abiertos ni permisos administrativos. Los cambios de responsable se documentan mediante entrega. Debe acordarse con la profesora cómo completar la rotación si quedan menos de once periodos para once roles.

## Validación pendiente

- Identificar a la persona número once y su usuario.
- Confirmar el reparto propuesto, la disponibilidad y los revisores.
- Confirmar el periodo de trabajo y el momento del cierre.
- Incorporar la URL real del Project.
- Crear los issues y completar sus enlaces en el archivo semanal.
