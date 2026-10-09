# UC11 — Simular evento IoT

| Campo               | Valor                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC11                                                                                                                                                                                           |
| Actor principal     | Operador                                                                                                                                                                                       |
| Actores secundarios | Vehículo IoT / gemelo digital (el destino de la telemetría inyectada)                                                                                                                          |
| Requisito(s)        | RF-15 (simular un evento sin hardware)                                                                                                                                                         |
| Prioridad           | P1                                                                                                                                                                                             |
| Estimación          | 2 h (HU-11a)                                                                                                                                                                                   |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; operador `../img/03-casos-de-uso-operador.png`; secuencia `../../diseno/img/05-secuencia-alerta.png`; estados `../../diseno/img/07-estados-vehiculo.png` |
| Historias           | HU-11a                                                                                                                                                                                         |

**Intención.** Provocar a voluntad un evento de seguridad o una posición para probar la ruta de alertas sin hardware físico, usando EXACTAMENTE las mismas constantes y el mismo disparador que la telemetría real, de modo que el resultado sea indistinguible del de UC20 salvo por el origen.

**Precondiciones.**

- El operador tiene sesión (UC02) con `role='operator'`.
- El `vehicle_id` existe en `vehicles` (puede estar en cualquier estado).
- El backend expone el mismo `evaluateTelemetry` de `alerts.ts` que consume UC20.

**Garantías (postcondiciones).**

- La telemetría inyectada pasa por las MISMAS 4 reglas y umbrales que la real; no hay una "versión suave" para el simulador.
- Cada alerta que se genere queda en `alert_log` con `origin='simulator'` (no `'telemetry'`), para que la bitácora (UC12) distinga el evento provocado del real.
- El simulador solo cambia estado por la vía normal (posición/`alert_state`/`alert_log`); no escribe nada "por detrás".

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                                                  | Datos (tabla / endpoint)                                                                                                             |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Operador        | Abre el simulador en `/admin`, elige el vehículo                                                                | `SELECT vehicles`                                                                                                                    |
| 2   | Operador        | Fija los campos que disparan la regla (ej. `impactG=4`, o `battery=10`, `helmetOn=false` con `tripActive=true`) | formulario de telemetría                                                                                                             |
| 3   | Operador        | Inyecta el evento                                                                                               | `POST /api/simulate {vehicleId, ...telemetry}`                                                                                       |
| 4   | Sistema         | Valida `role='operator'`                                                                                        | 403 si no lo es (ver E1)                                                                                                             |
| 5   | Sistema         | Evalúa con las constantes del dominio (`evaluateTelemetry`)                                                     | `impactG ≥ 3` ⇒ `crash`; `gpsFixAgeMs ≥ 10000` ⇒ `gps-lost`; `battery ≤ 15` ⇒ `low-battery`; `tripActive && !helmetOn` ⇒ `no-helmet` |
| 6   | Sistema         | Si hay novedad de alerta: `UPDATE vehicles.alert_state` + `INSERT alert_log (origin='simulator')` + SSE         | misma ruta que UC20                                                                                                                  |
| 7   | Operador        | Ve el efecto en `< 1 s` en el tablero (UC10) y en la bitácora (UC12)                                            | SSE                                                                                                                                  |

### Pasos alternos

- **2a.** El operador usa un preset ("caída", "sin casco", "GPS perdido", "batería crítica") que rellena los valores justos para cruzar el umbral correspondiente, en vez de escribirlos a mano.
- **5a.** Se cruzan varios umbrales a la vez: se registra solo la de MAYOR prioridad por el orden fijo `crash > no-helmet > gps-lost > low-battery` (`evaluateTelemetry`), igual que en telemetría real.
- **6a.** Los valores quedan por debajo de todos los umbrales (evento "normal"): no se crea `alert_log`; solo se actualiza la posición (misma regla que UC20 sin novedad).

### Excepciones

- **E1.** Sin `role='operator'`: 403 ANTES de evaluar; un cliente no puede inyectar telemetría.
- **E2.** `vehicle_id` inexistente: 404; no se escribe `alert_log` ni se toca `vehicles`.
- **E3.** Muestra malformada (campo faltante o no numérico): 422; no se evalúa nada.
- **E4.** Se reinyecta la MISMA alerta vigente (sin cambio de estado): no se duplica la fila en `alert_log` — la novedad se calcula contra `vehicles.alert_state` actual, idéntico a UC20.

### Reglas de negocio

- Comparte al 100 % el disparador y los umbrales de `alerts.ts`: `ALERT_THRESHOLDS = { criticalBattery: 15, impactG: 3, gpsLostMs: 10000 }` y el orden de prioridad `crash > no-helmet > gps-lost > low-battery`. No se duplica la lógica.
- La ÚNICA diferencia con UC20 es `alert_log.origin`: `'simulator'` aquí, `'telemetry'` en el vehículo real.
- `at` lo fija el reloj del servidor; el operador no manda timestamps.
- El simulador respeta la máquina de estados de `vehicles` (diagrama 07) y de alerta (RF-11: `sin_novedad|sin_casco|caida|perdida_gps|bateria_critica`); no fuerza transiciones ilegales.

### Fuera de alcance de este caso

- La recepción de telemetría real del gemelo/vehículo (UC20).
- Ver y filtrar el resultado en la bitácora (UC12) y los KPIs (UC10).
- El comando `UNLOCK` al vehículo: aquí se simula telemetría/alertas, no el desbloqueo (UC08/UC09).
