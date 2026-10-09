# UC14 — Asignar entrega a domiciliario

| Campo               | Valor                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC14                                                                                                                                                  |
| Actor principal     | Operador                                                                                                                                              |
| Actores secundarios | —                                                                                                                                                     |
| Requisito(s)        | RF-25 (nuevo); continúa RF-05 (modalidad domicilio)                                                                                                   |
| Prioridad           | P2                                                                                                                                                    |
| Estimación          | 5 h (HU-14a..b)                                                                                                                                       |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; operador `../img/03-casos-de-uso-operador.png`; secuencia `../../diseno/img/13-secuencia-entrega-domicilio.png` |
| Historias           | HU-14a, HU-14b                                                                                                                                        |

**Intención.** Convertir una reserva con modalidad `domicilio` en trabajo asignado a un domiciliario con hora límite, para que el cliente reciba el vehículo en su dirección.

**Precondiciones.**

- Existe `reservations` con `modality='delivery'`, `status='requested'`, `address` no vacía.
- El operador tiene sesión (UC02) con `role='operator'`.
- Existe al menos un usuario con `role='courier'` disponible.

**Garantías (postcondiciones).**

- Toda entrega creada nace con `status='assigned'`, `courier_id` y `deadline_at` definidos.
- No existen dos entregas `assigned`/`in_progress` para la misma reserva.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                   | Datos (tabla / endpoint)                                               |
| --- | --------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Operador        | Abre el panel "Entregas pendientes" (`/admin`)                   | `SELECT reservations WHERE modality='delivery' AND status='requested'` |
| 2   | Operador        | Elige la reserva y un domiciliario (ve carga actual de cada uno) | `SELECT users WHERE role='courier'` + conteo de `deliveries` activas   |
| 3   | Operador        | Fija el deadline (default: 45 min desde asignación) y confirma   | `POST /api/deliveries {reservationId, courierId, deadlineAt}`          |
| 4   | Sistema         | Valida: reserva pagable, courier activo, sin entrega previa      | ver precondiciones                                                     |
| 5   | Sistema         | Crea la entrega                                                  | `INSERT deliveries (status='assigned', assigned_at, deadline_at)`      |
| 6   | Sistema         | Confirma y la entrega aparece en "Mis entregas" del domiciliario | UI + SSE                                                               |

### Pasos alternos

- **2a.** No hay domiciliarios registrados: el operador crea la cuenta con rol `courier` (usa UC01; el seed del sistema trae 2 domiciliarios de demo: `DOMI-01`, `DOMI-02`).
- **3a.** El operador pospone: la reserva queda sin asignar con motivo visible (no se crea fila en `deliveries`).

### Excepciones

- **E1.** La reserva ya tiene entrega `assigned`/`in_progress`: 409 "esta reserva ya tiene una entrega en curso" (no se duplica el trabajo).
- **E2.** Domiciliario con 5 entregas activas (tope de carga): 422 con la lista de repartidores disponibles.

### Reglas de negocio

- Deadline default 45 min configurable; es la base del disparador de UC17 (cron `now > deadline_at`).
- Un domiciliario puede ver SOLO sus entregas; el operador ve todas.

### Fuera de alcance de este caso

- Ejecutar la entrega (UC16), marcar retrasos (UC17/UC19), enrutamiento de la ruta (lo hace el domiciliario con la API de Mapas, fuera de sistema).
