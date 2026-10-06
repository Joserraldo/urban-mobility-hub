# Especificación de Requisitos de Software (SRS) — v1.2 (PROPUESTA)

Plataforma Multimodal de Micromovilidad, Logística y Venta de Vehículos Urbanos
Universidad Autónoma de Bucaramanga · Ingeniería de Software II · Docente: Daniel Arenas Seeley
Autores: Jaime Alejandro Vega Barbosa, José Alejandro Téllez Prada, David Santiago González Nigrinis
Fecha de la propuesta: 1 de octubre de 2026

> **Estado: RF-20 a RF-24 APROBADOS por el usuario (1-oct-2026, nota `decision-rf-20-24`); el resto del documento sigue como borrador para aprobación del equipo.** Prioridad de implementación: P1 registro/login/consentimiento (RF-20, RF-21) y desbloqueo/alertas; P2 reservas y compras persistentes, tiempo real, plantilla biométrica (RF-22); P3 gestión de catálogo y hubs (RF-23, RF-24). Lo que no alcance se documenta como *planificado*.
> Es un archivo nuevo; `SRS_Plataforma_Micromovilidad.docx` (v1.1) no se modificó. Lo que **no** aparece aquí como cambiado se mantiene tal cual en la v1.1: secciones 1.1, 1.3–1.5, 2.3, 2.5, 3.3, 3.5 y 3.6 (definiciones, referencias, tipos de usuario, componentes de terceros, licenciamiento y avisos legales).
> Todo cambio sigue el plan de gestión de requisitos (Plan 4.4.1): se evalúa su impacto antes de aprobarse. Los cambios van marcados con **[CAMBIO Hn]** y listados en el §0.

## 0. Registro de cambios respecto a v1.1

| Hallazgo | Problema en v1.1 | Cambio en v1.2 |
|---|---|---|
| H2 | RF-10 y RNF-03/05 presuponen usuarios registrados, pero no hay requisitos de registro, login ni consentimiento. | Nuevos **RF-20, RF-21, RF-22**. |
| H5 | RF-08 y RNF-01 exigen lo mismo (posición ≤ 5 s). | RF-08 describe *qué* se hace; RNF-01 conserva la *medida*. |
| H6 | RF-09 ya es de 3 pasos y RNF-07 pide ≤ 3 pasos para compra, alquiler y desbloqueo: ambiguo. | RNF-07 define "paso" y la medición por flujo. |
| H7 | El SRS dice que el operador gestiona catálogo y hubs, pero no hay RF. | Nuevos **RF-23, RF-24**. |
| H9 | RD8 menciona "conducción indebida"; el SRS define solo 4 alertas. | RF-11 declara explícitamente las 4 alertas y deja fuera la conducción indebida. |
| H10 (nuevo) | RNF-05 pide credenciales "cifradas": una contraseña no se cifra, se *hashea*. | RNF-05 reformulado. |
| D1–D8 | Alcance del avance 1 basado en datos en memoria. | 1.2 y 2.4 actualizan al alcance con persistencia, API REST y tiempo real. |
| D6 | RF-01 redirige a móvil; hacerlo por user-agent en servidor daña el rastreo SEO. | RF-01 especifica detección en el cliente. |
| H1, H3, H4, H8 | Corresponden al Plan y al Análisis de Riesgos. | Ver `Plan_v1.2.md` y `Riesgos_v1.2.md`. |

## 1. Introducción (cambios)

### 1.2 Alcance **[CAMBIO D1–D5]**

Aplica al producto completo de la asignatura. La línea base es el prototipo `urban-mobility-hub` (landing, mapa y panel con datos simulados en memoria). La versión 1.2 amplía el alcance a: portal funcional con registro e inicio de sesión; catálogo, compra y alquiler con persistencia (SQLite); API REST con contrato publicado; tiempo real por WebSocket (con SSE de respaldo); simulación de vehículos mediante un broker MQTT en proceso; y módulo de seguridad IoT con las 4 alertas. La flota sigue siendo simulada (gemelos digitales); no hay hardware físico en este alcance.

## 2. Descripción general (cambios)

### 2.2 Funciones del producto **[CAMBIO H2, H7]**
Se agregan a las existentes: registro e inicio de sesión con consentimiento informado, gestión de la plantilla biométrica del usuario, y gestión del catálogo y de los hubs por el operador.

### 2.4 Restricciones **[CAMBIO D1–D8]**
- Equipo real de exactamente 3 personas.
- Sin vehículos físicos ni Raspberry Pi en producción: la telemetría la generan publicadores simulados que usan los mismos *topics* MQTT que usaría el hardware.
- Stack fijo: TanStack Start, React 19, TypeScript, Tailwind CSS 4, shadcn/ui.
- La estimación (Puntos de Función y COCOMO) y el DFD son entregables obligatorios (RF-18, RF-19).
- La interfaz solo consume datos mediante una interfaz `DataSource` y la API REST; no depende de datos en memoria (RNF-10).

## 3. Requisitos específicos

### 3.1 Requisitos funcionales

Los RF-02 a RF-07, RF-09, RF-10, RF-12 a RF-19 se mantienen **sin cambios** respecto a la v1.1 (se reproducen por completitud solo los modificados y nuevos).

#### 3.1.1 Landing

**RF-01 — Landing responsiva** **[CAMBIO D6]**. En resolución de escritorio, el sistema presenta la landing comercial completa (propuesta de valor, servicios, "Quiénes somos", CTA a la demo). En resolución móvil, el navegador es llevado a `/app` mediante detección en el cliente (ancho de pantalla), de modo que el contenido comercial siga siendo indexable por buscadores. La información comercial queda accesible desde un menú lateral.
*Criterio de aceptación:* con ancho < 768 px, `/` termina en `/app`; con un rastreador (sin JavaScript) `/` devuelve el HTML completo de la landing.

#### 3.1.4 Mapa

**RF-08 — Actualización de posición** **[CAMBIO H5]**. La posición de cada vehículo en el mapa debe actualizarse a partir de la telemetría (coordenadas GPS) emitida por su gemelo digital. *El plazo máximo se especifica una sola vez, en RNF-01.*

#### 3.1.6 Monitoreo de seguridad

**RF-11 — Estados de alerta IoT** **[CAMBIO H9]**. Cada vehículo reporta en todo momento exactamente uno de estos cinco estados: `sin_novedad`, `sin_casco`, `caida`, `perdida_gps`, `bateria_critica`. La detección de conducción indebida (exceso de velocidad, maniobras bruscas) **queda fuera de alcance** de este SRS; si se incorpora, será un nuevo estado y un nuevo RF.

#### 3.1.11 Usuarios e identidad **[NUEVO H2 · APROBADO]**

**RF-20 — Registro con consentimiento.** El sistema permite crear una cuenta con correo y contraseña. El registro exige aceptar de forma explícita y separada el tratamiento de datos personales y, si el usuario desea usar rostro, el de datos biométricos (Ley 1581 de 2012). Se guarda la fecha y la finalidad aceptada. Sin consentimiento no se crea la plantilla biométrica.
*Aceptación:* intentar registrarse sin marcar el consentimiento es rechazado; el consentimiento queda consultable.

**RF-21 — Inicio y cierre de sesión.** El sistema autentica con correo y contraseña, mantiene una sesión y permite cerrarla. Compra, alquiler y desbloqueo requieren sesión iniciada.
*Aceptación:* sin sesión, estas acciones piden iniciar sesión.

**RF-22 — Gestión de la plantilla biométrica.** El usuario registrado puede enrolar, reemplazar y eliminar su plantilla facial. Eliminar la cuenta o revocar el consentimiento elimina la plantilla.
*Aceptación:* tras revocar, el desbloqueo con rostro deja de estar disponible y no queda plantilla almacenada.

#### 3.1.12 Administración **[NUEVO H7 · APROBADO, prioridad P3]**

**RF-23 — Gestión del catálogo.** El operador crea, edita y da de baja vehículos (tipo, modelo, modo venta/alquiler, precio o tarifa por minuto, condición, especificación, hub asignado, aptitud de entrega).
**RF-24 — Gestión de hubs.** El operador crea, edita y da de baja hubs (ubicación y capacidad). No se puede dar de baja un hub con vehículos asignados.
*Aceptación RF-23/24:* agregar un vehículo u hub aparece en el mapa y el catálogo sin cambios de código (RNF-08). Solo el rol operador accede.

### 3.2 Requisitos no funcionales

**RNF-01 (rendimiento)** — se mantiene: la posición de cada vehículo debe reflejarse en el mapa en ≤ 5 s desde su generación en el gemelo digital. Es la única medida del requisito de RF-08.

**RNF-02** — se mantiene: un evento de alerta debe reflejarse en el panel en < 1 s.

**RNF-03** — se mantiene (plantillas biométricas cifradas, nunca en texto plano).

**RNF-04** — se mantiene (log auditable con vehículo, tipo y marca de tiempo; solo se agrega, no se modifica).

**RNF-05 — Credenciales y sesiones** **[CAMBIO H10]**. Las contraseñas se almacenan únicamente como *hash* con algoritmo de derivación lenta con sal (argon2 o bcrypt); nunca en texto plano ni cifradas de forma reversible. Los identificadores de sesión se almacenan como hash o se firman, y expiran.

**RNF-06** — se mantiene (disponibilidad ≥ 95 % en el periodo de pruebas).

**RNF-07 — Usabilidad: máximo 3 pasos** **[CAMBIO H6]**. Se define *paso* como una pantalla o acción de confirmación del usuario. El inicio de sesión **no** cuenta. Se mide desde que el usuario selecciona el vehículo hasta completar el flujo:

| Flujo | Pasos máximos |
|---|---|
| Compra | 1 seleccionar vehículo · 2 confirmar compra · 3 pagar |
| Alquiler | 1 seleccionar vehículo · 2 elegir modalidad (hub o domicilio) · 3 confirmar |
| Desbloqueo (RF-09) | 1 escanear QR · 2 verificar casco · 3 iniciar viaje (se mide con reserva activa) |

**RNF-08, RNF-09, RNF-10** — se mantienen.

**RNF-11 — Visibilidad en buscadores y accesibilidad** *(nuevo, propuesto por el equipo de calidad)*. Las páginas públicas se entregan renderizadas en servidor o prerenderizadas, con metadatos, sitemap y datos estructurados. Meta en Lighthouse: SEO ≥ 95, Accesibilidad ≥ 90, Rendimiento ≥ 85.

**RNF-12 — Calidad verificable** *(nuevo, propuesto por el equipo de calidad)*. Cobertura de pruebas automatizadas ≥ 80 % en los módulos de desbloqueo, seguridad y tracking; las pruebas corren en cada integración.

### 3.4 Interfaces del sistema **[CAMBIO D3–D4]**
Comunicación cliente–servidor: REST (`/api/*`, contrato publicado en OpenAPI) y WebSocket para posición y alertas (con SSE de respaldo). Comunicación vehículo–servidor: MQTT, topics `umh/vehicle/{id}/telemetry` y `umh/vehicle/{id}/alert`.

## 4. Matriz de trazabilidad (RF nuevos y modificados)

| Requisito | Origen | Artefacto de análisis/diseño | Verificación prevista |
|---|---|---|---|
| RF-01 | D6 | DFD P1 | E2E con viewport móvil + rastreo sin JS |
| RF-08 / RNF-01 | H5 | Secuencia de alerta | Prueba de latencia ≤ 5 s |
| RF-11 | H9 | Estados del vehículo | Un caso por alerta |
| RF-20 a RF-22 | H2 | Casos de uso, DFD P2/D1, DER | Unitarias + E2E de consentimiento |
| RF-23, RF-24 | H7 | Casos de uso, DFD P5 | Integración de API + E2E |
| RNF-05 | H10 | DER (`password_hash`) | Revisión de código + prueba |
| RNF-07 | H6 | Secuencia de desbloqueo | E2E contando pasos |
