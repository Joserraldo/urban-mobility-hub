# UC20 — Reportar telemetría y alertas

| Campo               | Valor                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC20                                                                                                                                           |
| Actor principal     | Vehículo IoT / gemelo digital (hoy: el publicador simulado que usa los mismos topics que usaría el hardware)                                   |
| Actores secundarios | Operador (consume el resultado en UC10/UC12); Cliente (ve la posición en UC06); API de Mapas (lat/lng → capa del mapa)                         |
| Requisito(s)        | RF-08 (posición desde telemetría), RF-11 (estados de alerta), RF-16 (gemelo digital); RNF-01 (posición ≤ 5 s), RNF-02 (alerta visible < 1 s)   |
| Prioridad           | P1                                                                                                                                             |
| Estimación          | 6 h (HU-20a..b)                                                                                                                                |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; secuencia `../../diseno/img/05-secuencia-alerta.png`; estados `../../diseno/img/07-estados-vehiculo.png` |
| Historias           | HU-20a, HU-20b                                                                                                                                 |

**Intención.** Recibir la telemetría que emite cada vehículo (posición, batería, impacto, GPS, casco), mover el gemelo digital en el mapa dentro del plazo y, si la muestra cruza un umbral, actualizar el estado de alerta del vehículo y registrar la alerta para que el operador la vea casi al instante.

**Precondiciones.**

- El vehículo existe en `vehicles` con su `hub_id`, `battery` y `status`.
- El gemelo publica telemetría por MQTT (`umh/vehicle/{id}/telemetry`), que el backend consume y re-expone; el puente HTTP equivalente es `POST /api/ingest` con una muestra `Telemetry`.
- La muestra trae `vehicleId, ts, lat, lng, battery, speedKmh, helmetOn, impactG, gpsFixAgeMs, tripActive`.

**Garantías (postcondiciones).**

- `alert_log` es **append-only** y queda una sola fila por alerta nueva; si `evaluateTelemetry` devuelve `ok`, NO se escribe alerta.
- `vehicles.alert_state` siempre refleja el estado actual del vehículo (RF-11: uno y solo uno de `sin_novedad|sin_casco|caida|perdida_gps|bateria_critica`).
- Una posición reportada se refleja en el mapa en ≤ 5 s (RNF-01); una alerta, en el panel en < 1 s (RNF-02). El log se persiste ANTES de notificar: si el SSE falla, la alerta no se pierde.

### Flujo principal (camino feliz)

| #   | Actor → Sistema   | Acción / respuesta del sistema                            | Datos (tabla / endpoint)                                                                                                         |
| --- | ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Vehículo (gemelo) | Emite una muestra de telemetría                           | `umh/vehicle/{id}/telemetry` → `POST /api/ingest {vehicleId, ts, lat, lng, battery, helmetOn, impactG, gpsFixAgeMs, tripActive}` |
| 2   | Sistema           | Actualiza el gemelo: posición, batería, `ts`              | `UPDATE vehicles SET lat, lng, battery`                                                                                          |
| 3   | Sistema           | Evalúa las 4 reglas con `evaluateTelemetry` (`alerts.ts`) | prioridad `crash > no-helmet > gps-lost > low-battery > ok`                                                                      |
| 4   | Sistema           | Publica la posición al mapa (RAM + SSE)                   | `GET /api/events` (SSE) → cliente (≤ 5 s, RNF-01)                                                                                |
| 5   | Sistema           | ¿Cambio de estado vs. `alert_state` actual?               | si `newState != vehicles.alert_state` → novedad                                                                                  |
| 6   | Sistema           | Registra la alerta (novedad)                              | `UPDATE vehicles SET alert_state`; `INSERT alert_log (vehicle_id, type, lat, lng, at, origin='telemetry')`                       |
| 7   | Sistema           | Notifica al operador                                      | SSE → tablero (UC10) y bitácora (UC12) en < 1 s (RNF-02)                                                                         |
| 8   | Operador          | Ve la alerta y el vehículo marcado                        | UI                                                                                                                               |

### Pasos alternos

- **3a (sin novedad).** `evaluateTelemetry` devuelve `ok` y `alert_state` ya era `sin_novedad`: el caso termina en el paso 4 — solo se refresca la posición, sin `INSERT alert_log`.
- **5a (regreso a normalidad).** La condición se resolvió (ej. casco puesto de nuevo): `newState='sin_novedad'` ≠ estado anterior → SÍ es novedad → se actualiza `vehicles.alert_state` y se registra la transición. Toda alerta (incluidas las que se cierran) `«include»` UC12.
- **6a (varias simultáneas).** Una muestra cruza dos umbrales (baja batería + sin casco): se guarda solo la de mayor prioridad por el orden de `evaluateTelemetry` (RF-11: exactamente un estado por vehículo). El origen es `telemetry`.
- **1a (vía simulador).** El mismo payload llega de UC11: idéntica ruta, pero `alert_log.origin='simulator'` (esa variante NO es este caso, es UC11; aquí `origin='telemetry'`).

### Excepciones

- **E1.** `vehicleId` desconocido o muestra sin campos obligatorios: se rechaza la muestra; ningún `vehicles`/`alert_log` cambia.
- **E2.** Telemetría con posición vieja (`now - ts > POSITION_MAX_AGE_MS`, 5000 ms): no se pinta como fresca (no viola RNF-01 mostrando un dato caduco); se marca el vehículo stale en UC10.
- **E3.** No se puede persistir `alert_log` (falla la BD): NO se pierde la alerta — se reintenta la escritura; el SSE no se envía hasta que el append-only quedó registrado (la bitácora manda sobre la notificación).
- **E4.** SSE caído tras persistir: la alerta ya está en `alert_log`; al reconectar, el `SELECT` de UC12 la recupera. La persistencia no depende del canal en vivo.

### Reglas de negocio

- Umbrales EXACTOS del dominio (`alerts.ts`, `ALERT_THRESHOLDS`): `impactG ≥ 3` ⇒ `crash`; `tripActive && !helmetOn` ⇒ `no-helmet`; `gpsFixAgeMs ≥ 10000` ⇒ `gps-lost`; `battery ≤ 15` ⇒ `low-battery`; si no ⇒ `ok`. (Compartidos con UC11: una sola `evaluateTelemetry`.)
- Orden de prioridad obligatorio cuando coexisten condiciones: `crash > no-helmet > gps-lost > low-battery > ok` (R-07 del SRS).
- Mapeo estado → `vehicles.alert_state` (RF-11): `crash→caida`, `no-helmet→sin_casco`, `gps-lost→perdida_gps`, `low-battery→bateria_critica`, `ok→sin_novedad`. La alerta solo se escribe al CAMBIAR de estado (anti-spam).
- `alert_log` append-only (RNF-04): `INSERT`, nunca `UPDATE`/`DELETE`; `origin` real = `telemetry`; `at` del reloj del servidor.
- Latencias medibles: RNF-01 ≤ 5 s posición (fuente `POSITION_MAX_AGE_MS`, se mide `renderedAt - generatedAt`); RNF-02 < 1 s alerta en panel.
- La telemetría no muta `vehicles.status` (eso es reserva/desbloqueo/venta); solo mueve `lat/lng/battery/alert_state`.

### Fuera de alcance de este caso

- Provocar el evento a mano como operador: eso es UC11 (`origin='simulator'`).
- Consultar/filtrar el historial de alertas (UC12) y los KPIs (UC10): aquí se generan, allá se revisan.
- El desbloqueo y sus comandos (`UNLOCK`, `umh/vehicle/{id}/unlock`): UC08/UC09.
- La conducción indebida (exceso de velocidad, maniobras): explícitamente fuera de RF-11; no hay quinta alerta.
