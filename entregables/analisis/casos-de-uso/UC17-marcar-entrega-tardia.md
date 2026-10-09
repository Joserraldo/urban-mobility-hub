# UC17 — Marcar entrega tardía

| Campo               | Valor                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC17                                                                                                                                                                                                             |
| Actor principal     | Sistema (cron automático) o Domiciliario (manual, con `reason`)                                                                                                                                                  |
| Actores secundarios | API de correo (Brevo) — indirecta, a través de UC19                                                                                                                                                              |
| Requisito(s)        | RF-27; «extend» de UC16 (solo ocurre bajo la condición de incumplimiento del deadline)                                                                                                                           |
| Prioridad           | P2                                                                                                                                                                                                               |
| Estimación          | 4 h (HU-17a..b)                                                                                                                                                                                                  |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; domiciliario `../img/04-casos-de-uso-domiciliario.png`; estados `../../diseno/img/15-estados-entrega.png`; secuencia `../../diseno/img/13-secuencia-entrega-domicilio.png` |
| Historias           | HU-17a, HU-17b                                                                                                                                                                                                   |

**Intención.** Dejar constancia auditable de que una entrega no se completó antes de su `deadline_at`, por dos vías: el cron del sistema (determinista, sin depender de que el domiciliario acuerde) o el propio domiciliario admitiendo el retraso con motivo. Al entrar a `late` se «extiende» el flujo a UC19 (correo al cliente y al operador).

**Precondiciones.**

- Existe `deliveries` con `status IN ('assigned','in_progress')` y `now() > deadline_at` (deadline fijado en UC14).
- Para la vía manual: el domiciliario tiene sesión (UC02) y es el `courier_id` de la entrega (UC15/UC16).

**Garantías (postcondiciones).**

- Una entrega entra a `late` EXACTAMENTE una vez: el cron y el manual no duplican el estado ni el disparo de UC19.
- Si la causa fue manual, `reason` no nulo queda persistido en `deliveries`; si fue cron, `reason='deadline_vencido (cron)'`.
- El cambio a `late` NO revierte la reserva ni el vehículo: son un flag de incumplimiento, no un cancelamiento (UC16 puede completarla después con justificación).

### Flujo principal (camino feliz — vía cron, HU-17a)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                                     | Datos (tabla / endpoint)                                                                                                                   |
| --- | --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Sistema (cron)  | Despierta cada 60 s                                                                                | job `delivery-late-sweep`                                                                                                                  |
| 2   | Sistema         | Busca vencidas sin marcar (el `WHERE status IN (...)` excluye las ya `late`: idempotencia natural) | `UPDATE deliveries SET status='late', reason='deadline_vencido (cron)' WHERE status IN ('assigned','in_progress') AND now() > deadline_at` |
| 3   | Sistema         | Si hubo filas afectadas, notifica a las UIs                                                        | SSE (bandeja del domiciliario + `/admin`, badge "retrasada")                                                                               |
| 4   | Sistema         | Por cada entrada a `late`, «extiende» a UC19                                                       | UC19 encola `notifications` (correo Brevo)                                                                                                 |

### Pasos alternos

- **2a (vía manual, HU-17b).** El domiciliario reconoce el retraso antes de que lo atrape el cron: `PATCH /api/deliveries/{id}/late {reason}`; el sistema valida sesión, propiedad, que la entrega siga en `assigned|in_progress` y que `reason` no sea vacío → `UPDATE deliveries SET status='late', reason`, y el mismo disparo de UC19 (pasos 3–4). `late` manual deja de quedar "atrapable" por el cron (ya no matchea el `WHERE`).

### Excepciones

- **E1.** La entrega ya está `delivered`: no se marca tardía — 409 en el manual; el cron jamás la toca (fuera del `WHERE`). Una entrega cerrada a tiempo retro-se hace tarde: el historial manda.
- **E2.** La entrega ya está `late`: el manual responde 409 "ya registrada como tardía"; el cron la ignora. En ambos casos NO se vuelve a disparar UC19 (la no-duplicación de correos la garantiza UC19, no este caso).
- **E3.** Manual sin `reason` (vacío/ausente): 422; la constancia sin motivo no sirve para auditoría.
- **E4.** Sin sesión o `courier_id` ajeno en el manual: 401/403 antes del `UPDATE` (mismo patrón de UC16 E2).

### Reglas de negocio

- «extend»: UC17 solo ocurre bajo condición (deadline incumplido); nunca forma parte del camino feliz de UC16.
- `now()` SIEMPRE del reloj del servidor; el cron cada 60 s es el SLA de detección (un retraso se conoce a más tardar 1 min después del deadline, RF-27).
- `reason` obligatorio en el manual; el cron escribe motivo automático distinguible.
- La idempotencia de estado es de este caso (el `WHERE`); la idempotencia de notificación es de UC19 (`delivery_id + template + to_email`).
- Desde `late` la única salida válida es `delivered` con el flujo de UC16 (E3 de allí); no hay `late → assigned` (no se borra un incumplimiento).

### Fuera de alcance de este caso

- Enviar el correo y su reintentos (UC19), fijar el deadline (UC14), cerrar la entrega con retraso (UC16).
- Escalar el retraso a sanción/reasignación automática (no hay RF; hoy lo decide el operador en `/admin`).
