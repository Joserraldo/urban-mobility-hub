# UC04 — Comprar vehículo

| Campo               | Valor                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC04                                                                                                                                          |
| Actor principal     | Cliente                                                                                                                                       |
| Actores secundarios | UC18 Realizar pago (→ Pasarela de pagos)                                                                                                      |
| Requisito(s)        | RF-03; RNF-07; incluye RF-26 (UC18)                                                                                                           |
| Prioridad           | P1                                                                                                                                            |
| Estimación          | 5 h (HU-04a..b)                                                                                                                               |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png`; secuencia `../../diseno/img/11-secuencia-compra-pago.png` |
| Historias           | HU-04a, HU-04b                                                                                                                                |

**Intención.** Reservar para el cliente un vehículo de venta en 3 pasos (seleccionar → confirmar → pagar), dejar la compra pagada y marcar el vehículo como vendido. El cobro en sí lo ejecuta UC18 (`«include»`).

**Precondiciones.**

- El cliente tiene sesión (UC02); sin ella, la compra pide login primero.
- El vehículo elegido está `mode='sale' AND status='available'` (vino del catálogo, UC03).

**Garantías (postcondiciones).**

- Al confirmar (paso 2) existe una `purchases` en `status='pending'`; todavía NO se cobró.
- Al aprobarse el pago (paso 3 = UC18): `purchases.status='paid'` y `vehicles.status='sold'`, en la misma transacción.
- Un vehículo ya vendido no admite segunda compra (409): no se pisa una venta.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                  | Datos (tabla / endpoint)                                                          |
| --- | --------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Cliente         | Selecciona un vehículo de venta (paso 1)        | desde `/catalogo` (UC03)                                                          |
| 2   | Cliente         | Confirma la compra (paso 2)                     | `POST /api/purchases {vehicleId}`                                                 |
| 3   | Sistema         | Valida sesión y `available`; registra la compra | `SELECT vehicles WHERE id=:id` → `INSERT purchases (status='pending', price_cop)` |
| 4   | Sistema         | Muestra el total COP y ofrece pagar (paso 3)    | UI de confirmación                                                                |
| 5   | Cliente         | Elige método y paga → UC18 `«include»`          | `POST /api/payments {owner_type:'purchase', owner_id, method}`                    |
| 6   | UC18            | Cobró aprobado                                  | `{status:'approved', reference}`                                                  |
| 7   | Sistema         | Cierra la venta (transacción)                   | `UPDATE purchases SET status='paid'` + `UPDATE vehicles SET status='sold'`        |
| 8   | Sistema         | Muestra recibo con la referencia de la pasarela | UI + `GET /api/purchases`                                                         |

### Pasos alternos

- **5a.** Pago con PSE o tarjeta guardada: cambia `method` dentro de UC18, no cambia este caso.
- **7a.** Compra con entrega a domicilio: tras `paid` se encola el reparto (UC14–UC16); el vehículo pasa a `'sold'` igual y la entrega lo lleva a la `address`.

### Excepciones

- **E1.** El vehículo se vendió entre confirmar y pagar (`status='sold'`): 409 `VEHICLE_UNAVAILABLE`; la `purchases` queda `failed`, no `paid`. El cliente elige otra unidad.
- **E2.** UC18 rechaza el pago: la compra NO pasa a `paid`; queda `pending` pagable de nuevo o `failed` (regla de UC18); el vehículo sigue `available`.
- **E3.** Sin sesión al confirmar: 401 antes del `INSERT`; se redirige a login (UC02) y se retoma.

### Reglas de negocio

- RNF-07: exactamente 3 pasos (seleccionar, confirmar, pagar); el login no cuenta y el pago vive dentro del tercer paso vía UC18. Una pantalla extra incumple el requisito.
- La venta es atómica: `purchases.status='paid'` y `vehicles.status='sold'` cambian juntos o ninguno (paso 7).
- El monto se fija al confirmar desde `price_cop`; UC18 cobra ese valor, no uno del cliente. Dinero COP entero.
- Ciclo del vehículo: `'available' → (pending) → 'sold'`; no se vende dos veces.

### Fuera de alcance de este caso

- Cobrar (UC18) y hablar con la pasarela (externa).
- La entrega física a domicilio (UC14–UC16).
- Devoluciones / reembolsos (sin RF; se documenta como planificado).
