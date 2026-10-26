# 02 · Requisitos funcionales (RF-01…RF-27)

Los RF-01 a RF-19 provienen del SRS v1.1 (texto reproducido en el `.docx` entregado); los RF-20 a
RF-27, del SRS v1.2. **Los RF-20 a RF-27 están marcados como APROBADOS por el usuario**, de modo que
un incumplimiento ahí no es “alcance recortado”: es una promesa aceptada sin cumplir.

## 1. Tablero

| RF    | Requisito (resumen)                              | Pri. | Veredicto | Evidencia principal                                                                 |
| ----- | ------------------------------------------------ | ---- | --------- | ----------------------------------------------------------------------------------- |
| RF-01 | Landing responsiva con redirección móvil         | P1   | ✅ Cumple | `routes/index.tsx:82` (`matchMedia(max-width: 767px)` → `/app`); SSR entrega HTML completo |
| RF-02 | Catálogo de venta con todos los atributos        | P2   | ✅ Cumple | `/catalogo`, `VehicleCard`; incluye hub y especificación                            |
| RF-03 | Compra de vehículo                               | P1   | ✅ Cumple | `POST /api/purchases` + `POST /api/payments` → `paid` y vehículo `sold`             |
| RF-04 | Listado de flota en alquiler                     | P1   | ✅ Cumple | `/app`: tarifa/min, batería, especificación y hub                                   |
| RF-05 | Dos modalidades de alquiler y 4 estados          | P1   | 🟡 Parcial | Modalidades y estados existen; **no se exige la marca `deliverable`** para domicilio |
| RF-06 | Tres capas del mapa                              | P1   | ✅ Cumple | Flota de alquiler, hubs y stock de venta en la misma vista                          |
| RF-07 | Panel de detalle de hub                          | P2   | ✅ Cumple | Capacidad, ocupados, en carga y vehículos del hub                                   |
| RF-08 | Posición actualizada por telemetría              | P1   | ✅ Cumple | `fleet-sim.ts` mueve cada 2 s; SSE `position`                                        |
| RF-09 | Desbloqueo en 3 pasos                            | P1   | ✅ Cumple | Máquina `qr → helmet → ready`, TTL 120 s, rechazo por orden                          |
| RF-10 | Reconocimiento facial alterno                    | P2   | 🟡 Parcial | Flujo existe, pero el `score` se calcula y se envía desde el cliente                 |
| RF-11 | Cinco estados de alerta                          | P1   | ✅ Cumple | Enum `ok/no-helmet/crash/gps-lost/low-battery` en dominio y BD                       |
| RF-12 | Alerta visible + log auditable                   | P1   | ✅ Cumple | `stream.emit` + tabla `alerts`; “limpiar” solo cambia el estado, no borra el log      |
| RF-13 | KPIs de flota                                    | P1   | ✅ Cumple | Conectados, hubs activos, batería promedio y alertas activas                         |
| RF-14 | Detalle de gemelo digital                        | P1   | ✅ Cumple | Selección de vehículo en `/admin` con todos los atributos                            |
| RF-15 | Simulador de 4 alertas                           | P1   | ✅ Cumple | `POST /api/admin/simulate-alert` con los 4 tipos                                     |
| RF-16 | Modelo de gemelo digital                         | P1   | ✅ Cumple | Tabla `vehicles` + `evaluateTelemetry`                                               |
| RF-17 | Fuente de datos única                            | P1   | ✅ Cumple | Mapa y panel leen el mismo repositorio SQLite                                        |
| RF-18 | Estimación PF + COCOMO documentada               | P3   | ✅ Cumple | `Plan_v1.2.md` §4.1 (corrección H1 y re-estimación)                                   |
| RF-19 | DFD del sistema                                  | P3   | ✅ Cumple | `entregables/analisis` (entregado 1-oct, +1 día; registrado como H8)                  |
| RF-20 | Registro con consentimiento informado            | P1   | 🟡 Parcial | Exige consentimiento y guarda fecha/finalidad; **no es separado** para biometría      |
| RF-21 | Inicio y cierre de sesión                        | P1   | ✅ Cumple | `scrypt` + sal, sesión HMAC con expiración, 401 en acciones protegidas               |
| RF-22 | Gestión de la plantilla biométrica               | P2   | ❌ No cumple | En modo API el enrolamiento responde **422**; no hay reemplazo/revocatoria en UI     |
| RF-23 | Gestión del catálogo (crear/editar/baja)         | P3   | 🟡 Parcial | Alta y baja en `/admin`; **edición solo por API**, sin formulario                    |
| RF-24 | Gestión de hubs (crear/editar/baja)              | P3   | 🟡 Parcial | Alta y baja con guardia 409; **edición solo por API**                                |
| RF-25 | Entrega a domicilio con cierre atómico           | P2   | 🟡 Parcial | Asignación, aislamiento y anti-duplicado OK; **cierre no atómico**                   |
| RF-26 | Pago explícito con comprobante                   | P1   | 🟡 Parcial | Aprobado/rechazado con referencia; **timeout no modelado**                           |
| RF-27 | Aviso de retraso por correo                      | P2   | ✅ Cumple | Dos notificaciones, estado `simulated`/`failed`, sin duplicados                      |

**Recuento: 19 ✅ · 7 🟡 · 1 ❌.** Ningún requisito funcional está ausente del código; la única
falla total es la operación real del enrolamiento biométrico en modo API.

## 2. Requisitos con brecha (detalle)

### RF-05 · Modalidades de alquiler — 🟡

**Lo que pide.** Dos modalidades: hub (estación a estación) y domicilio **“para los vehículos
marcados como aptos para entrega”**. Estados: solicitada, activa, completada, cancelada.

**Lo que hay.** `POST /api/reservations` valida `modality ∈ {hub, delivery}` y que haya dirección
para domicilio, pero **no consulta `vehicles.deliverable`**. Cualquier vehículo de alquiler puede
pedirse a domicilio, aunque el catálogo lo marque como no apto.

**Impacto.** Un operador puede recibir una entrega imposible (p. ej., un dron o un vehículo sin
aptitud declarada). Rompe la regla de negocio del SRS y la coherencia con el filtro del catálogo.

**Evidencia.** `src/server/api/handlers.ts:250-272`; campo `deliverable` en
`src/server/repositories.ts:160-180`.

### RF-10 · Reconocimiento facial alterno — 🟡

**Lo que pide.** Reconocimiento facial del **usuario registrado** como mecanismo alterno.

**Lo que hay.** El flujo existe en la interfaz y en la máquina de estados. Pero:

- el parecido se calcula en el navegador comparando un vector de 16×16 píxeles en grises contra el
  guardado en `localStorage` (`camera.ts:43-75`);
- se envía solo `{ score }` y el servidor acepta cualquier valor ≥ 0,85 (`unlock.ts:67`);
- si no hay cámara y `DEMO_TOOLS` está activo, la interfaz asigna `score = 0.95` fijo
  (`UnlockFlow.tsx:132`).

**Impacto.** No es autenticación: es una simulación con una puerta trasera explícita. Sirve para
demostrar el flujo, no para cumplir el requisito en un entorno real. Se debe declarar así en el SRS
o sustituirlo por un servicio real (ver B3).

**Evidencia.** `src/lib/camera.ts`, `src/components/mobility/UnlockFlow.tsx:124-145`,
`src/server/domain/unlock.ts:60-70`.

### RF-20 · Registro con consentimiento — 🟡

**Lo que pide.** Aceptar **de forma explícita y separada** (a) tratamiento de datos personales y
(b) datos biométricos si se usará el rostro. Guardar fecha y finalidad.

**Lo que hay.** Un único checkbox que mezcla ambos tratamientos (`AuthForm.tsx:110-125`). El
payload de registro solo envía `consent` (personal); el campo `biometric` que el endpoint acepta
**nunca se envía desde la interfaz**. Se guarda `datos_personales` con fecha; **nunca se crea la fila
`biometria`** para usuarios nuevos.

**Impacto en cascada.** Sin consentimiento biométrico, `POST /api/auth/face` responde **422** (RF-22).
Es decir, el registro “funciona”, pero deja al usuario en un estado donde no puede usar la función
que el propio formulario anuncia.

**Texto legal inexacto.** El checkbox afirma tres cosas que el código no cumple: “la plantilla se
guarda cifrada” (no se cifra), “puedo revocar esta autorización en cualquier momento” (no hay acción
de revocatoria) y el campo de contraseña dice “se almacena cifrada” (se hashea, que es lo correcto,
pero el término es incorrecto). Para la Ley 1581 esto importa: el consentimiento debe describir el
tratamiento real.

**Evidencia.** Prueba ejecutada: login `cliente@demo.co` → `POST /api/auth/face` → **422**. Código:
`handlers.ts:139-160,188-196`, `AuthForm.tsx:37,51,110-125`.

### RF-22 · Plantilla biométrica — ❌

**Lo que pide.** Enrolar, **reemplazar** y **eliminar** la plantilla; eliminar también al borrar la
cuenta o revocar el consentimiento. Aceptación: tras revocar, el desbloqueo facial deja de estar
disponible y no queda plantilla.

**Lo que hay.**

| Aspecto            | Estado                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Enrolar (mock)     | Funciona; guarda el vector en `localStorage`                                                |
| Enrolar (API)      | **Bloqueado**: exige consentimiento `biometria` que la UI no puede otorgar → 422            |
| Reemplazar         | Sobrescribe (upsert) en BD y `localStorage`                                                 |
| Eliminar/revocar   | El endpoint soporta `{enrolled:false}`, pero **ninguna pantalla lo llama**                   |
| Contenido real     | El servidor guarda el literal `"plantilla-demo-no-biometria-real"` en `cipher_text`         |
| Cifrado (RNF-03)   | **No hay**: `dataKey()` está definido y exportado, pero nunca se usa; no hay AES-GCM        |

**Impacto.** El requisito no se puede cumplir de punta a punta en el modo que se presenta como
“backend real”, y la aceptación (“tras revocar…”) es inalcanzable porque no existe la acción de
revocar en la interfaz. Es la brecha funcional más seria del proyecto y la de mayor riesgo legal
(RD11).

**Evidencia.** `src/server/repositories.ts:312-330`, `src/server/db/seed.ts:6-10,90`,
`src/lib/data/api.ts:292-296`, `src/components/mobility/UnlockFlow.tsx:136-144,345-355`.

### RF-23 y RF-24 · Gestión de catálogo y hubs — 🟡

**Lo que piden.** Crear, **editar** y dar de baja.

**Lo que hay.** `AdminCatalog.tsx` permite alta y baja de vehículos y hubs. La edición **sí existe
en la API** (`POST /api/admin/vehicles` y `/api/admin/hubs` hacen upsert), pero **no hay formulario
de edición**: el operador tendría que llamar la API a mano. La baja de hub sí respeta la regla
“no se puede dar de baja un hub con vehículos asignados” (409).

**Impacto.** El requisito se cumple “por API”, no por producto. Para la demostración, un operador no
puede corregir un precio ni una capacidad desde la interfaz.

**Evidencia.** `src/components/mobility/AdminCatalog.tsx` (solo iconos `Plus` y `Trash2`),
`handlers.ts:492-540`, `repositories.ts:160-180,228-258`.

### RF-25 · Entrega a domicilio — 🟡

**Lo que pide.** Asignación con hora límite; el domiciliario ve **solo sus** entregas; confirmación
que cierra **de forma atómica** (entrega + reserva + estado del vehículo en una sola transacción);
anti-duplicado (409). Aceptación: un domiciliario no ve ni cierra entregas ajenas (403).

**Lo que hay.**

- ✅ Asignación con `deadlineMinutes` y validación de rol `courier`.
- ✅ `GET /api/deliveries` filtra por `courier_id`; `PATCH` responde 403 si la entrega es ajena.
- ✅ Anti-duplicado: 409 si ya hay entrega activa para la reserva.
- ❌ **Cierre no atómico**: `deliveries.update(...)` → `reservations.setStatus(active)` →
  `reservations.setStatus(completed)` → `vehicles.setStatus(in_use)` son cuatro escrituras sueltas.
  Si falla la tercera, queda una entrega `delivered` con reserva `active`.
- ❌ **Estado final incoherente**: la reserva se marca `completed` inmediatamente y el vehículo queda
  `in_use`; el alquiler “nace cerrado”.
- ❌ No se usa `transition()` (la máquina de estados del dominio) para pasar de `requested` a
  `active`/`completed`, así que las reglas de transición no se aplican en este camino.

**Impacto.** La garantía que el SRS escribe con la palabra “atómica” no existe. Es exactamente el
tipo de defecto que una prueba de integración con fallo inyectado detectaría (y no hay).

**Evidencia.** `handlers.ts:604-624`; `src/server/domain/reservations.ts`.

### RF-26 · Pago explícito con comprobante — 🟡

**Lo que pide.** Cada intento registrado con monto, referencia y estado; rechazo sin alterar el
negocio; **timeout nunca asumido como aprobado**.

**Lo que hay.**

- ✅ Tabla `payments` con `amount_cop`, `reference`, `status`, `reason`.
- ✅ Rechazo: se inserta el intento, la compra pasa a `failed` y se responde 402; el vehículo no
  cambia de estado.
- ✅ Cargo del viaje con `rentalCost` por minuto.
- ❌ **No hay timeout**: la interfaz `PaymentGateway` solo contempla `approved | rejected`; la
  pasarela simulada siempre resuelve. UC18-E2 (timeout 10 s → `rejected` con `reason='timeout'`,
  negocio intacto) no está implementado ni probado.
- ❌ Las escrituras (`payments.create`, `purchases.setStatus`, `vehicles.setStatus`) no van en
  transacción; un fallo intermedio deja el pago registrado y el negocio a medias.

**Impacto.** El requisito se cumple en los dos caminos felices/infractores, pero no en el tercero
que el propio caso de uso describe. En una pasarela real el timeout es el caso más común.

**Evidencia.** `src/server/services/pasarela.ts:19-40`, `handlers.ts:684-730`,
`entregables/analisis/casos-de-uso/UC18-realizar-pago.md` (E2).

## 3. Requisitos que cumplen, con observaciones

No son brechas, pero conviene que el informe no las oculte:

- **RF-03 (compra).** No hay unicidad de compra por vehículo: dos usuarios pueden crear una compra
  `pending` del mismo vehículo y ambos pagar; el segundo pago sobrescribe el estado. No viola el
  texto del RF, pero sí la expectativa de “un vehículo, un comprador”.
- **RF-11/RF-12 (alertas).** El modelo de estados es correcto y el log es solo-append, pero el
  simulador devuelve `alert_state` a `ok` cada 2 s (B8/R2). El KPI de “alertas activas” se ve vacío
  aunque la bitácora conserve el evento.
- **RF-19 (DFD).** Cumple, pero se entregó un día después del hito (30-sep → 1-oct), ya registrado
  como H8/RD14 en el Plan.
- **RF-27 (correo).** Cumple en modo `simulated`. El envío real con Brevo no se pudo verificar sin
  `BREVO_API_KEY`; la robustez ante fallo sí está probada (`brevo.ts`, 4 pruebas unitarias).

## 4. Cómo se verificó

- **Estático:** lectura de `handlers.ts`, `repositories.ts`, `domain/*`, `data/api.ts`,
  `data/mock.ts` y componentes de `mobility/`.
- **Dinámico (modo API, SQLite):** login de los tres roles, compra, alquiler en ambas modalidades,
  pago aprobado y rechazado (`999999`), desbloqueo QR→casco→inicio, cierre de viaje, asignación y
  ejecución de entrega, marcado de tardía y aparición de las dos notificaciones.
- **Prueba puntual documentada:** `POST /api/auth/face` con sesión de `cliente@demo.co` → 422.
- **No verificado:** E2E automatizado (sin navegadores), Brevo real (sin clave), hardware IoT.
