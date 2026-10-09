# UC18 — Realizar pago

| Campo               | Valor                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC18                                                                                                                                                                    |
| Actor principal     | Cliente (lo ejecuta dentro de UC04 Comprar o UC05 Alquilar)                                                                                                             |
| Actores secundarios | Pasarela de pagos (simulada en demo; interfaz lista para Wompi/PayU)                                                                                                    |
| Requisito(s)        | RF-26 (nuevo); deriva de RF-03 y RF-05                                                                                                                                  |
| Prioridad           | P1                                                                                                                                                                      |
| Estimación          | 8 h (HU-18a..c)                                                                                                                                                         |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; secuencias `../../diseno/img/11-secuencia-compra-pago.png`, `12-secuencia-alquiler-pago.png`, `14-secuencia-auth-pago-cierre.png` |
| Historias           | HU-18a, HU-18b, HU-18c                                                                                                                                                  |

**Intención.** Cobrar un monto en COP y dejar un comprobante con referencia de la pasarela, reutilizable desde la compra, el alquiler y el cargo del viaje.

**Precondiciones.**

- El actor tiene sesión iniciada (UC02) — el caso falla antes de tocar la pasarela si no la tiene.
- Existe una fila `purchases` en `status='pending'` o una `reservations` en `status='requested'` con monto calculado.

**Garantías (postcondiciones).**

- Cada intento de pago deja EXACTAMENTE una fila en `payments` (`approved` o `rejected`), con `reference` no nula si fue aprobado.
- Si el pago es rechazado, NADA del negocio cambia de estado (el vehículo sigue `available`, la compra sigue `pending`).

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                       | Datos (tabla / endpoint)                                                                                                                                                                               |
| --- | --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Cliente         | Confirma pagar (paso 3 de RNF-07)                    | `POST /api/payments {owner_type, owner_id, method}`                                                                                                                                                    |
| 2   | Sistema         | Valida sesión, monto > 0 y que el owner esté pagable | `SELECT purchases/reservations`                                                                                                                                                                        |
| 3   | Sistema         | Llama la pasarela con token de prueba                | `pasarela-pagos.ts → cobrar(amount_cop)`                                                                                                                                                               |
| 4   | Pasarela        | Resuelve aprobado                                    | `{status:'approved', reference:'PAY-…'}`                                                                                                                                                               |
| 5   | Sistema         | Registra el comprobante                              | `INSERT payments (status='approved')`                                                                                                                                                                  |
| 6   | Sistema         | Cierra el negocio                                    | compra: `UPDATE purchases SET status='paid'` + `UPDATE vehicles SET status='sold'`; alquiler: `UPDATE vehicles SET status='reserved'`; viaje: `UPDATE reservations SET status='completed', total_cost` |
| 7   | Sistema         | Muestra confirmación con referencia                  | UI con `$monto COP — PAY-…`                                                                                                                                                                            |

### Pasos alternos

- **1a.** El cliente paga con PSE/tarjeta guardada: mismo flujo, cambia `method` (`card | pse | cash`); `cash` solo aplica a recoger en hub y lo marca el operador.
- **3a.** La compra incluye prepago de viaje (`kind='base'`) y luego el cierre genera `kind='cargo_viaje'`: dos `payments` para la misma `reservations`, nunca uno que sobreescriba al otro.

### Excepciones

- **E1.** Pasarela rechaza (`status='rejected'`): se inserta el `payments` rechazado, la compra pasa a `failed`, el vehículo NO cambia de estado; el cliente ve "Pago rechazado, intenta con otro método" (402).
- **E2.** Pasarela no responde (timeout 10 s): NO se asume aprobado; se inserta `payments (status='rejected', reason='timeout')` y la compra queda `pending` pagable de nuevo (idempotencia por `owner_id` + referencia única).
- **E3.** Sin sesión: 401 antes del paso 3; nunca se cobra "en modo fantasma".

### Reglas de negocio

- Dinero SIEMPRE en COP entero (convención del contrato `domain.ts`).
- El monto del viaje: `rentalCost = ceil(minutos) * pricePerMinute` (`server/domain/reservations.ts`), redondeo hacia arriba, mínimo una unidad de tarifa.
- Un `payments` aprobado es inmutable: para devolver, se crea un pago negativo nuevo (fuera de alcance v2, se documenta como planificado).

### Fuera de alcance de este caso

- La decisión de QUÉ se cobra (eso es UC04/UC05 y el cierre de viaje).
- Reembolsos y conciliación contable (no hay RF).
