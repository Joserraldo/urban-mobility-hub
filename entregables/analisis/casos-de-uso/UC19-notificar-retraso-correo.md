# UC19 — Notificar retraso por correo

| Campo               | Valor                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC19                                                                                                                                                                                                             |
| Actor principal     | Sistema (se dispara solo o vía UC17); beneficiarios: Cliente y Operador                                                                                                                                          |
| Actores secundarios | API de correo (Brevo)                                                                                                                                                                                            |
| Requisito(s)        | RF-27 (nuevo)                                                                                                                                                                                                    |
| Prioridad           | P2                                                                                                                                                                                                               |
| Estimación          | 5 h (HU-19a..c)                                                                                                                                                                                                  |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; domiciliario `../img/04-casos-de-uso-domiciliario.png`; secuencia `../../diseno/img/13-secuencia-entrega-domicilio.png`; estados `../../diseno/img/15-estados-entrega.png` |
| Historias           | HU-19a, HU-19b, HU-19c                                                                                                                                                                                           |

**Intención.** Cuando una entrega a domicilio se pasa de su hora límite (`deadline_at`), avisar por correo al cliente (transparencia) y al operador (acción), dejando registro auditable del envío.

**Precondiciones.**

- Existe `deliveries` que entra a `status='late'` (por cron que detecta `now > deadline_at` sin entregar, o por UC17 manual).
- El cliente y el operador tienen `email` en `users`.
- El sistema tiene plantilla `entrega_tardia` (asunto + cuerpo con nombre, dirección, minutos de retraso).

**Garantías (postcondiciones).**

- Por cada entrada a `late` hay al menos una fila en `notifications` por destinatario, con `status ∈ {queued, sent, failed, simulated}`.
- El correo es **side-effect**: si Brevo falla, la entrega NO cambia de estado ni se revierte; el fallo queda visible en `/admin`.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                | Datos (tabla / endpoint)                                                             |
| --- | --------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Sistema         | Detecta que una `deliveries` pasa a `late`                    | `UPDATE deliveries SET status='late'`                                                |
| 2   | Sistema         | Encola una notificación por destinatario (cliente + operador) | `INSERT notifications (channel='email', template='entrega_tardia', status='queued')` |
| 3   | Sistema         | Renderiza la plantilla con los datos de la entrega            | (plantilla local, sin PII fuera de lo necesario)                                     |
| 4   | Sistema         | Llama a Brevo                                                 | `POST https://api.brevo.com/v3/smtp/email` (header `xkeysib`)                        |
| 5   | Brevo           | Acepta y devuelve `messageId`                                 | 2xx                                                                                  |
| 6   | Sistema         | Marca la notificación como enviada                            | `UPDATE notifications SET status='sent', provider_id`                                |
| 7   | Operador        | Ve en `/admin` que el aviso salió                             | tabla de notificaciones                                                              |

### Pasos alternos

- **4a.** Modo demo sin `BREVO_API_KEY`: el sistema NO llama a Brevo; deja `status='simulated'` y muestra el correo tal cual se enviaría en `/admin`. La demo nunca falla.

### Excepciones

- **E1.** Brevo responde 4xx/5xx o expira (timeout 10 s): `UPDATE notifications SET status='failed', error`. Se reintenta hasta 2 veces con backoff; si persiste, queda `failed` y `/admin` lo marca en rojo. El retry NO duplica: se reutiliza la misma fila `notifications` (idempotencia por `delivery_id + template + to_email`).
- **E2.** Destinatario sin email: se omite ese destinatario y se deja `failed (reason='no_email')`, no aborta a los demás.

### Reglas de negocio

- Mínimo 5 s entre el cambio a `late` y el envío (evita spam si el cron revisa varias veces el mismo retraso).
- No se notifica más de UN retraso por entrega (la segunda detección no crea `notifications` nueva; se comprueba con `provider_id IS NULL OR status='failed'`).
- Nunca se envían datos biométricos ni tokens en el correo (solo nombre, dirección de entrega y demora).

### Fuera de alcance de este caso

- Decidir QUÉ es "tarde" (deadline lo fija UC14; la detección es UC17).
- Notificaciones push/SMS (no hay RF).

### Cómo se prueba (SQA)

- Prueba unitaria de `brevo.ts` con fetch simulado (2xx, 5xx, sin clave → `simulated`).
- Prueba e2e: crear entrega con `deadline_at` en el pasado, correr el cron, verificar 2 filas `notifications` y que NO cambia `deliveries.status` si falla Brevo.
