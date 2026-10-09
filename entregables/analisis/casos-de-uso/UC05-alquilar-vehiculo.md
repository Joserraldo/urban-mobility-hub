# UC05 — Alquilar vehículo (hub o domicilio)

| Campo               | Valor                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC05                                                                                                                                            |
| Actor principal     | Cliente                                                                                                                                         |
| Actores secundarios | API de Mapas (geocodificación); UC18 Realizar pago (→ Pasarela); UC14–UC16 (entrega a domicilio)                                                |
| Requisito(s)        | RF-05, RF-06; RNF-07; RF-25 (domicilio vía UC14–UC16)                                                                                           |
| Prioridad           | P1                                                                                                                                              |
| Estimación          | 6 h (HU-05a..c)                                                                                                                                 |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png`; secuencia `../../diseno/img/12-secuencia-alquiler-pago.png` |
| Historias           | HU-05a, HU-05b, HU-05c                                                                                                                          |

**Intención.** Crear una reserva de alquiler en 3 pasos (seleccionar → elegir modalidad → confirmar), cobrar el prepago base con UC18 (`«include»`) y dejar el vehículo `reserved`. Si es a domicilio, captura la dirección y la geocodifica; el reparto físico lo ejecutan UC14–UC16.

**Precondiciones.**

- El cliente tiene sesión (UC02).
- El vehículo elegido está `mode='rent' AND status='available'` (vino del mapa, UC06).
- Para domicilio, el vehículo tiene `deliverable` activo (solo las unidades marcadas admiten reparto).

**Garantías (postcondiciones).**

- Existe una `reservations` en `status='requested'` con `modality='hub'|'delivery'`; en domicilio, `address` geocodificada (lat/lng).
- UC18 dejó un `payments(kind='base')` aprobado → reserva prepago y `vehicles.status='reserved'`.
- La reserva `requested` habilita el desbloqueo (UC08); el viaje y su cargo final se cierran aparte.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                     | Datos (tabla / endpoint)                                         |
| --- | --------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Cliente         | Selecciona un vehículo de la flota (paso 1)                                        | `/app` (UC06) → `GET /api/vehicles?mode=rent`                    |
| 2   | Cliente         | Elige modalidad `hub` o `domicilio` (paso 2)                                       | UI `modality: hub \| delivery`                                   |
| 3   | Cliente         | Confirma el alquiler (paso 3)                                                      | `POST /api/reservations {vehicleId, modality, address?}`         |
| 4   | Sistema         | Valida sesión, `mode='rent' AND status='available'` y (si domicilio) `deliverable` | `SELECT vehicles WHERE id=:id`                                   |
| 5   | Sistema         | Crea la reserva                                                                    | `INSERT reservations (status='requested', modality, created_at)` |
| 6   | Cliente         | Paga el prepago base → UC18 `«include»`                                            | `POST /api/payments {owner_type:'reservation', kind:'base'}`     |
| 7   | Sistema         | Al aprobar UC18, bloquea el vehículo                                               | `UPDATE vehicles SET status='reserved'`                          |
| 8   | Sistema         | Muestra la reserva `requested` (base para desbloquear en UC08)                     | `GET /api/reservations`                                          |

### Pasos alternos

- **3a.** Modalidad domicilio: en el paso 3 se captura `address` y el sistema la geocodifica con la API de Mapas (lat/lng) ANTES del `INSERT`; el reparto lo ejecutan UC14 (asignar), UC15 (bandeja) y UC16 (entregar). El vehículo `reserved` sale del hub a manos del domiciliario.
- **3b.** Modalidad hub: `address` queda nula; el cliente va al hub y desbloquea con QR (UC08). Sin reparto.
- **6a.** El prepago base (`kind='base'`) y el cargo final del viaje (`kind='cargo_viaje'`, al cerrar) son DOS `payments` de la misma reserva; uno no sobreescribe al otro (regla de UC18).

### Excepciones

- **E1.** El vehículo se alquiló o vendió entre seleccionar y confirmar (`status != 'available'`): 409 `VEHICLE_UNAVAILABLE`; no se crea la reserva.
- **E2.** Domicilio para un vehículo no `deliverable`: 409 ("entrega a domicilio no soportada por el vehículo"); se ofrece recoger en hub.
- **E3.** La API de Mapas falla o no resuelve la dirección: 400 `VALIDATION_ERROR`; la reserva no se crea (sin geocodificación no hay ruta de reparto).
- **E4.** UC18 rechaza el prepago: la reserva NO queda pagada; el vehículo sigue `available` (rechazo no cambia el negocio).
- **E5.** Sin sesión: 401 antes del `INSERT reservations`.

### Reglas de negocio

- RNF-07: 3 pasos (seleccionar, elegir modalidad, confirmar); el pago vive dentro del paso de confirmar vía UC18 y no añade un paso extra. Login no cuenta.
- Estado inicial de la reserva: `'requested'` (máquina de estados en `server/domain/reservations.ts`: `requested → active → completed | cancelled`).
- Domicilio exige `vehicles.deliverable`; hub no.
- La dirección se geocodifica al crear la reserva y se reutiliza: no se vuelve a llamar al externo por la misma fila.
- Dinero COP entero; el cargo del viaje usa `rate_per_min_cop` al cerrar (UC08/finish), no aquí.

### Fuera de alcance de este caso

- Cobrar (UC18) y la pasarela (externa).
- Desbloquear y rodar el viaje / cargo final (UC08–UC09, `/api/reservations/{id}/finish`).
- Asignar y ejecutar la entrega a domicilio (UC14–UC16).
