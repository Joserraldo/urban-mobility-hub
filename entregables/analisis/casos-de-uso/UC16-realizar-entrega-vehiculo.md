# UC16 — Realizar entrega de vehículo

| Campo               | Valor                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC16                                                                                                                                                                                                             |
| Actor principal     | Domiciliario                                                                                                                                                                                                     |
| Actores secundarios | Cliente (recipientes en la dirección); Sistema (SSE al operador)                                                                                                                                                 |
| Requisito(s)        | RF-25; extiende el flujo a domicilio de UC05 (alquiler) y UC04 (compra con entrega)                                                                                                                              |
| Prioridad           | P2                                                                                                                                                                                                               |
| Estimación          | 6 h (HU-16a..b)                                                                                                                                                                                                  |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; domiciliario `../img/04-casos-de-uso-domiciliario.png`; secuencia `../../diseno/img/13-secuencia-entrega-domicilio.png`; estados `../../diseno/img/15-estados-entrega.png` |
| Historias           | HU-16a, HU-16b                                                                                                                                                                                                   |

**Intención.** Materializar el paso físico: el domiciliario lleva el vehículo a la `address` de la reserva, lo entrega al cliente y lo confirma en el sistema, cerrando la reserva y dejando el estado de `deliveries`, `reservations` y `vehicles` coherentes entre sí.

**Precondiciones.**

- Existe `deliveries` con `status='assigned'` o `'in_progress'`, `courier_id` = el domiciliario autenticado (creada en UC14, listada en UC15).
- La `reservations` asociada tiene `modality='delivery'` y `status='active'` (reserva pagada vía UC18).
- El vehículo está en poder del domiciliario (salió del hub).

**Garantías (postcondiciones).**

- Al confirmar: `deliveries.status='delivered'` con `delivered_at` = ahora (reloj del servidor), `reservations.status='completed'`.
- `vehicles.status` queda coherente con la tenencia del vehículo (regla abajo): NUNCA `available` tras una entrega a domicilio, porque el vehículo ya no está en un hub.
- Si el paso 6 falla a mitad, la transacción revierte TODO: no existen entregas `delivered` con reservas `active`.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                 | Datos (tabla / endpoint)                                                                                                                                                                |
| --- | --------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Domiciliario    | Toma la entrega de la bandeja (UC15) y pulsa "Iniciar entrega" | `PATCH /api/deliveries/{id} {status:'in_progress'}`                                                                                                                                     |
| 2   | Sistema         | Valida sesión, propiedad y transición permitida                | `assigned → in_progress` (diagrama 15)                                                                                                                                                  |
| 3   | Sistema         | Registra el inicio                                             | `UPDATE deliveries SET status='in_progress'`                                                                                                                                            |
| 4   | Domiciliario    | Se desplaza a la dirección (fuera del sistema) y llega         | —                                                                                                                                                                                       |
| 5   | Domiciliario    | Entrega el vehículo al cliente y pulsa "Confirmar entrega"     | `PATCH /api/deliveries/{id} {status:'delivered'}`                                                                                                                                       |
| 6   | Sistema         | Valida y cierra el negocio en una transacción                  | `UPDATE deliveries SET status='delivered', delivered_at=now()`; `UPDATE reservations SET status='completed'`; `UPDATE vehicles SET status='in_use'` (alquiler) o deja `'sold'` (compra) |
| 7   | Sistema         | La entrega sale de "Mis entregas" y `/admin` ve el cierre      | SSE                                                                                                                                                                                     |

### Pasos alternos

- **5a.** El cliente no está en la dirección: el domiciliario deja nota con `PATCH /api/deliveries/{id} {status:'in_progress', reason:'cliente no presente'}`; la entrega SIGUE activa y el operador ve el motivo en `/admin` para reprogramar o reasignar (UC14). Si se pasa el deadline, el cron de UC17 la marca `late` — el intento fallido no se pinta como entrega realizada.

### Excepciones

- **E1.** La entrega ya está `delivered`: 409 "esta entrega ya fue confirmada" (no se pisa `delivered_at` ni se re-completa la reserva).
- **E2.** Sin sesión, token expirado o `courier_id` distinto al de la sesión: 401/403 antes del paso 2; un domiciliario no puede cerrar entregas ajenas.
- **E3.** La entrega está en `late` y el domiciliario confirma sin justificación: 422 con el motivo visible; se resuelve marcando la causa en UC17 (manual) — el retraso se deriva allí, este caso no lo inventa.
- **E4.** `status='assigned'` → `delivered` directo (sin pasar por `in_progress`): 409; el flujo de estados no admite saltos.

### Reglas de negocio

- Máquinas de estados de `deliveries`: `assigned → in_progress → delivered`; `assigned|in_progress → late → delivered` (solo con justificación, UC17). Diagrama 15 es la fuente.
- Regla de `vehicles.status` al entregar (elegida y documentada a propósito): la entrega a domicilio transfiere la TENENCIA al cliente, NO libera el vehículo. Compra con entrega → queda `'sold'` (UC18 ya lo marcó al pagar; aquí no cambia). Alquiler con entrega → pasa a `'in_use'` mientras el cliente lo tiene; volver a `'available'` ocurre en la devolución en hub, que está fuera de este caso. Nada de `'available'`: falsearía el catálogo (se ofrecería un vehículo que no está en ningún hub).
- `delivered_at` lo fija SIEMPRE el servidor; el cliente del domiciliario no manda timestamps.
- El cierre de `reservations` y `vehicles` es atómico con el de `deliveries` (misma transacción, paso 6).

### Fuera de alcance de este caso

- Decidir la hora límite (UC14), la bandeja de trabajo (UC15), marcar/corregir el retraso (UC17) y avisar por correo (UC19).
- Devolución del alquiler en hub y cargo final del viaje (flujo de hub, UC18).
