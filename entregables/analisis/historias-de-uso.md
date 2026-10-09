# Historias de usuario — mapa y planificación

> Formato de cada historia: ver `../plantillas/plantilla-historia-de-uso.md`.
> Esta matriz es el índice maestro: una fila = una historia. Los **criterios de aceptación** se
> derivan de los pasos, alternos y excepciones del documento del caso padre
> (`casos-de-uso/UCnn-*.md`) — no se duplican aquí (principio DRY del plan SQA: un hecho, un lugar).
> Capacidad del equipo: 3 personas × 16 h/semana = 96 h. Total estimado: **99 h** → la columna
> "semana" ya reparte el ajuste (UC13 P3 y UC09 se mueven si aprieta; ver nota al final).

## Semana 1 — identidad, dinero y entrega (P1/P2 duros)

| HU     | Historia                                             | UC padre | Rol        | Prioridad | Est | Sem | Criterios salen de                      |
| ------ | ---------------------------------------------------- | -------- | ---------- | --------- | --- | --- | --------------------------------------- |
| HU-01a | Registrarse con consentimiento de datos personales   | UC01     | Cliente    | P1        | 2 h | 1   | flujo 1–5, E1 (422 sin consentimiento)  |
| HU-01b | Consentimiento biométrico separado y revocable       | UC01     | Cliente    | P1        | 2 h | 1   | alterno biométrica, RNF-03              |
| HU-02a | Iniciar sesión (hash + sesión firmada httpOnly)      | UC02     | Compartido | P1        | 2 h | 1   | flujo 1–4, E1 genérico 401              |
| HU-02b | Cerrar sesión e invalidar token                      | UC02     | Compartido | P1        | 2 h | 1   | garantía de expiración                  |
| HU-04a | Confirmar compra de vehículo disponible              | UC04     | Cliente    | P1        | 2 h | 1   | flujo 1–3, E 409 vendido                |
| HU-04b | Compra que se atasca en pago (integración UC18)      | UC04     | Cliente    | P1        | 3 h | 1   | excepción pago rechazado                |
| HU-18a | Cobro aprobado deja comprobante en `payments`        | UC18     | Sistema    | P1        | 3 h | 1   | flujo 1–7                               |
| HU-18b | Rechazo y timeout no cambian el negocio              | UC18     | Sistema    | P1        | 3 h | 1   | E1, E2 (idempotencia)                   |
| HU-18c | Cargo del viaje con `rentalCost` ceil por minuto     | UC18     | Sistema    | P1        | 2 h | 1   | regla rentalCost, alterno 3a            |
| HU-05a | Alquilar en hub (3 pasos RNF-07)                     | UC05     | Cliente    | P1        | 2 h | 1   | flujo principal                         |
| HU-05b | Alquilar a domicilio con dirección + geocodificación | UC05     | Cliente    | P1        | 2 h | 1   | alterno domicilio, API Mapas            |
| HU-05c | Reserva pagada deja vehículo `reserved`              | UC05     | Sistema    | P1        | 2 h | 1   | garantía + E duplicados                 |
| HU-08a | Crear sesión de desbloqueo y escaneo QR válido       | UC08     | Cliente    | P1        | 3 h | 1   | flujo 1–4, E1 QR inválido               |
| HU-08b | Verificación de casco (confidence ≥ 0.80)            | UC08     | Cliente    | P1        | 3 h | 1   | flujo 5–7, E orden inválido             |
| HU-08c | Iniciar viaje solo con paso `ready` y TTL vigente    | UC08     | Cliente    | P1        | 2 h | 1   | E expired, transición reserva           |
| HU-20a | Ingesta de telemetría actualiza gemelo (≤ 5 s)       | UC20     | Sistema    | P1        | 3 h | 1   | flujo sin novedad, RNF-01               |
| HU-20b | Reglas de alerta con umbrales del dominio (< 1 s)    | UC20     | Sistema    | P1        | 3 h | 1   | alt novedad, prioridad 4 reglas, RNF-02 |

**Subtotal semana 1: 41 h.**

## Semana 2 — operación, domiciliario, correo y gestión

| HU     | Historia                                                   | UC padre | Rol          | Prioridad | Est | Sem | Criterios salen de                   |
| ------ | ---------------------------------------------------------- | -------- | ------------ | --------- | --- | --- | ------------------------------------ |
| HU-10a | Panel KPIs + tabla de gemelos desde la misma fuente        | UC10     | Operador     | P1        | 3 h | 2   | flujo 1–4, RF-17                     |
| HU-11a | Simulador inyecta eventos con origen `simulator`           | UC11     | Operador     | P1        | 2 h | 2   | flujo + regla no confundir origen    |
| HU-12a | Bitácora auditable solo-append en vivo                     | UC12     | Operador     | P1        | 3 h | 2   | flujo, RNF-04                        |
| HU-14a | Asignar entrega con courier y deadline                     | UC14     | Operador     | P2        | 3 h | 2   | flujo 1–6, E1 duplicado              |
| HU-14b | Crear cuenta domiciliario y ver carga de trabajo           | UC14     | Operador     | P2        | 2 h | 2   | alterno 2a, E2 tope de carga         |
| HU-15a | Bandeja "Mis entregas" ordenada por deadline               | UC15     | Domiciliario | P2        | 3 h | 2   | flujo, E401/403, estado vacío        |
| HU-16a | Tomar entrega e iniciarla (`in_progress`)                  | UC16     | Domiciliario | P2        | 2 h | 2   | flujo 1–3, E4 sin saltos             |
| HU-16b | Confirmar entrega cierra todo en una transacción           | UC16     | Domiciliario | P2        | 4 h | 2   | flujo 5–7, E1, garantía atómica      |
| HU-17a | Cron marca tardía al vencer el deadline                    | UC17     | Sistema      | P2        | 2 h | 2   | disparador automático, idempotencia  |
| HU-17b | Domiciliario marca tardía con causa                        | UC17     | Domiciliario | P2        | 2 h | 2   | flujo manual, E3                     |
| HU-19a | Plantilla `entrega_tardia` y encolado por destinatario     | UC19     | Sistema      | P2        | 2 h | 2   | flujo 1–3                            |
| HU-19b | Envío real por Brevo con `messageId`                       | UC19     | Sistema      | P2        | 2 h | 2   | flujo 4–6, E1 retries                |
| HU-19c | Sin clave o fallo ⇒ `simulated`/`failed`, demo no se rompe | UC19     | Sistema      | P2        | 1 h | 2   | alterno 4a, E1/E2                    |
| HU-03a | Catálogo público SSR indexable (SEO)                       | UC03     | Cliente      | P2        | 3 h | 2   | flujo + RNF-11                       |
| HU-06a | Mapa multicapa con flota en vivo (SSE)                     | UC06     | Cliente      | P1        | 3 h | 2   | flujo, RNF-01                        |
| HU-06b | Capas: alquiler disponible, hubs, stock de venta           | UC06     | Cliente      | P1        | 2 h | 2   | alterno capas                        |
| HU-07a | Detalle de hub con ocupados calculados                     | UC07     | Cliente      | P2        | 2 h | 2   | flujo, regla no-columna              |
| HU-09a | Enrolar/revocar plantilla biométrica (RF-22)               | UC09     | Cliente      | P2        | 2 h | 2   | precondición consentimiento, borrado |
| HU-09b | Desbloqueo facial como alterno al QR (score ≥ 0.85)        | UC09     | Cliente      | P2        | 3 h | 2   | flujo extend, E bajo score           |

**Subtotal semana 2: 47 h.**

## Semana 3+ (planificado — se muestra como roadmap, no como "hecho")

| HU     | Historia                            | UC padre | Rol      | Prioridad | Est | Sem | Notas                                                |
| ------ | ----------------------------------- | -------- | -------- | --------- | --- | --- | ---------------------------------------------------- |
| HU-13a | CRUD de vehículos desde /admin      | UC13     | Operador | P3        | 3 h | 3+  | aparece en mapa/catálogo sin cambiar código (RNF-08) |
| HU-13b | CRUD de hubs con bloqueo de borrado | UC13     | Operador | P3        | 3 h | 3+  | E: hub con vehículos ⇒ 409                           |

**Total: 99 h (41 + 47 + 11).** Ajuste honesto: caben 96 h en 2 semanas; UC13 (P3, 11 h) se queda como **planificado** y UC09-HU-09b baja a semana 3 si la semana 2 aprieta. Esta decisión va registrada como defecto de capacidad, no como "todo verde".

## Reglas del tablero

1. Una HU se toma del tablero solo si su caso padre está descrito (archivo en `casos-de-uso/`).
2. "Hecho" = prueba que pasa + captura de interfaz + doc actualizado (plan SQA `../../sqa/01-plan-sqa-proactivo.md`).
3. Si una HU necesita más de un día, se parte antes de tomarla.
