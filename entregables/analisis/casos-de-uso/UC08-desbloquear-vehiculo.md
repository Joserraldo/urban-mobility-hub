# UC08 — Desbloquear vehículo (QR + casco)

| Campo               | Valor                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC08                                                                                                                                                                                                                                        |
| Actor principal     | Cliente                                                                                                                                                                                                                                     |
| Actores secundarios | Vehículo IoT / gemelo digital (recibe el comando `UNLOCK`); Servicio facial (detección de casco en el navegador)                                                                                                                            |
| Requisito(s)        | RF-09; RNF-07 (desbloqueo en 3 pasos: escanear QR · verificar casco · iniciar viaje)                                                                                                                                                        |
| Prioridad           | P1                                                                                                                                                                                                                                          |
| Estimación          | 8 h (HU-08a..c)                                                                                                                                                                                                                             |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png`; secuencia `../../diseno/img/04-secuencia-desbloqueo.png`; estados `../../diseno/img/07-estados-vehiculo.png`, `../../diseno/img/06-estados-reserva.png` |
| Historias           | HU-08a, HU-08b, HU-08c                                                                                                                                                                                                                      |

**Intención.** Abrir un vehículo ya alquilado comprobando, en el sitio y en tres pasos, que el cliente es quien tiene la reserva y que lleva casco puesto; al confirmar, enviar el comando `UNLOCK` al vehículo y arrancar el viaje.

**Precondiciones.**

- El cliente tiene sesión iniciada (UC02).
- «include» UC05: existe una `reservations` del cliente con `status='requested'` para ese `vehicle_id` (viaje pagado o prepago; el monto lo fija UC18).
- El vehículo está en `vehicles` con `status='reserved'` y su `qr_code = 'UMH:<vehicleId>'` pegado en el manubrio.

**Garantías (postcondiciones).**

- Todo intento de desbloqueo abre EXACTAMENTE una fila en `unlock_sessions` con `step` inicial `'qr'` y `expires_at = now + 120 s` (`UNLOCK_TTL_MS`).
- El comando `UNLOCK` se publica SOLO si la sesión llegó a `step='ready'` sin caducar: se pasa la reserva a `'active'` y el vehículo a `'in_use'`.
- Si el desbloqueo se rechaza o caduca, NADA del negocio cambia: la reserva sigue `'requested'` y el vehículo sigue `'reserved'`.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                                                                    | Datos (tabla / endpoint)                                                                           |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Cliente         | Desde "Mis reservas" pulsa "Desbloquear" en la reserva activa                                                                     | `POST /api/unlock/sessions {vehicleId, reservationId}`                                             |
| 2   | Sistema         | Valida sesión y que la reserva sea `'requested'`; abre la sesión                                                                  | `INSERT unlock_sessions (step='qr', expires_at=now+120000)`                                        |
| 3   | Cliente         | Escanea el QR del vehículo (cámara del navegador)                                                                                 | `POST /api/unlock/sessions/{id}/qr {code}`                                                         |
| 4   | Sistema         | Compara `code` contra `UMH:<vehicleId>` (`scanQr`)                                                                                | paso `'qr'` → `'helmet'` si coincide                                                               |
| 5   | Cliente         | Ajusta el casco y confirma la verificación; el navegador detecta el casco (face-api.js) y devuelve `{helmetDetected, confidence}` | `POST /api/unlock/sessions/{id}/helmet {helmetDetected, confidence}`                               |
| 6   | Sistema         | Exige `step='helmet'` y `confidence ≥ 0.80` (`HELMET_MIN_CONFIDENCE`) (`verifyHelmet`)                                            | paso `'helmet'` → `'ready'`                                                                        |
| 7   | Cliente         | Pulsa "Iniciar viaje" (paso 3 de RNF-07)                                                                                          | `POST /api/unlock/sessions/{id}/start`                                                             |
| 8   | Sistema         | `canStartTrip` (step `'ready'` y sin caducar) → cierra el negocio                                                                 | `UPDATE reservations SET status='active'` (event `start`, máquina de `reservations.ts`)            |
| 9   | Sistema         | Marca el vehículo en uso y libera el candado                                                                                      | `UPDATE vehicles SET status='in_use'`; publica comando `UNLOCK` en topic `umh/vehicle/{id}/unlock` |
| 10  | Sistema         | Muestra "Viaje iniciado" y el mapa empieza a seguir la posición                                                                   | UI + SSE                                                                                           |

### Pasos alternos

- **4a (alterno de identidad).** El QR está dañado o ilegible: en lugar de escanear, el cliente usa rostro (`«extend»` de UC09). La sesión sigue en `step='qr'` hasta que el match facial lo mueva a `'helmet'`; desde ahí el flujo continúa idéntico en el paso 5.
- **6a.** `confidence` suficiente pero el cliente quiere repetir la toma (mal encuadre): nueva llamada a `/helmet` sobre la MISMA sesión; no se crea `unlock_sessions` duplicada mientras no caduque.
- **2a.** La sesión anterior caducó (`'expired'`) antes de terminar: el cliente inicia una sesión nueva desde el paso 1; la fila `expired` queda como evidencia, no se reutiliza.

### Excepciones

- **E1.** QR que no coincide (`code ≠ 'UMH:<vehicleId>'`): `unlock_sessions.step='denied'`, `reason='El código QR no corresponde a este vehículo'`; respuesta 4xx; reserva y vehículo intactos.
- **E2.** Casco no detectado o `confidence < 0.80`: `step='denied'`, `reason='No se detectó el casco con suficiente confianza'`; el viaje no arranca.
- **E3.** TTL vencido (más de 120 s desde la creación o entre pasos): cualquier paso devuelve `step='expired'`; el `start` es imposible; el cliente reinicia (2a).
- **E4.** Orden inválido (mandar `/helmet` o `/start` antes del QR): `verifyHelmet` lanza `UnlockOrderError` ("Primero escanea el código QR") y `canStartTrip` responde `false`; 409, sin cambios de estado.
- **E5.** Sin sesión o sin reserva `'requested'`: 401/409 antes del paso 2; el `«include»` de UC05 es obligatorio.

### Reglas de negocio

- Máquina de estados del desbloqueo (`unlock.ts`): `qr → helmet → ready`, con `denied`/`expired` terminales. La columna `step` guarda ese valor exacto.
- `UNLOCK_TTL_MS = 120_000` (120 s): `expires_at` lo fija el servidor; el cliente no manda timestamps.
- QR válido ⇔ `code.trim() === 'UMH:' + vehicleId`, mismo patrón que `vehicles.qr_code`.
- `HELMET_MIN_CONFIDENCE = 0.80`: umbral duro; por debajo, `denied`.
- `start` exige `step='ready'` y sesión vigente; dispara en cadena `reservations requested → active` (única transición legal desde `'requested'` con evento `start`), `vehicles → 'in_use'` y el comando MQTT.
- Máximo 3 pasos de usuario (RNF-07): escanear QR · verificar casco · iniciar viaje. El login no cuenta.
- El comando `UNLOCK` se envía una sola vez por sesión exitosa (idempotencia por `unlock_sessions.id`).

### Fuera de alcance de este caso

- La identidad por rostro es UC09 (`«extend»`); aquí solo se consume como alterno del paso 4.
- La creación/pago de la reserva (UC05/UC18), el cierre del viaje (`active → completed` con `rentalCost = ceil(minutos) * rate_per_min_cop`) y el seguimiento de posición (UC20/UC06).
