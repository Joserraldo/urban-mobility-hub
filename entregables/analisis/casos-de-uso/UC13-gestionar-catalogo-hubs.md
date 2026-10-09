# UC13 — Gestionar catálogo y hubs

| Campo               | Valor                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC13                                                                                                                                     |
| Actor principal     | Operador                                                                                                                                 |
| Actores secundarios | — (SSE al mapa/catálogo del cliente: UC03/UC06/UC07)                                                                                     |
| Requisito(s)        | RF-23 (CRUD vehículos), RF-24 (CRUD hubs); RNF-08 (alta visible sin cambiar código)                                                      |
| Prioridad           | P3                                                                                                                                       |
| Estimación          | 6 h (HU-13a..b)                                                                                                                          |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; operador `../img/03-casos-de-uso-operador.png`; estados `../../diseno/img/07-estados-vehiculo.png` |
| Historias           | HU-13a, HU-13b                                                                                                                           |

**Intención.** Mantener la oferta real del negocio: alta, edición y baja de vehículos (tipo, modelo, modo, precio/tarifa, condición, especificación, hub, aptitud de entrega) y de hubs (ubicación y capacidad), con la regla dura de no dejar hubs huérfanos, para que los cambios se reflejen en mapa y catálogo sin tocar código.

**Precondiciones.**

- El operador tiene sesión (UC02) con `role='operator'`.
- La tabla `vehicles` y la tabla `hubs` existen (semilla del sistema).
- Para dar de baja un hub, no debe tener vehículos asignados (regla RF-24).

**Garantías (postcondiciones).**

- Un alta de vehículo o hub aparece en el mapa y el catálogo SIN desplegar código (RNF-08): el frontend lee por API, no por dato hardcodeado.
- Nunca queda un vehículo apuntando a un hub inexistente ni un hub dado de baja con vehículos encima: la integridad referencial se respeta en cada escritura.

### Flujo principal — vehículos (HU-13a)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                                                                                                                                      | Datos (tabla / endpoint)                          |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Operador        | Abre "Catálogo" en `/admin` y pulsa "Nuevo vehículo"                                                                                                                                                | `GET /api/vehicles`                               |
| 2   | Operador        | Completa tipo (`kind`), modelo, modo (venta/alquiler), precio `price_cop` o tarifa `rate_per_min_cop`, condición, especificación (`spec`), hub asignado (`hub_id`), apto de entrega (`deliverable`) | formulario                                        |
| 3   | Operador        | Guarda                                                                                                                                                                                              | `POST /api/vehicles {kind, model, mode, price_cop | rate_per_min_cop, condition, spec, hub_id, deliverable}` |
| 4   | Sistema         | Valida campos, dinero en COP entero y que `hub_id` exista                                                                                                                                           | ver precondiciones                                |
| 5   | Sistema         | Inserta el vehículo disponible                                                                                                                                                                      | `INSERT vehicles (status='available')`            |
| 6   | Sistema         | El vehículo aparece en mapa (UC06), catálogo (UC03/UC07) y gemelos (UC10)                                                                                                                           | SSE                                               |

### Flujo principal — hubs (HU-13b)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                | Datos (tabla / endpoint)                                          |
| --- | --------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 7   | Operador        | Abre "Hubs" y crea/edita ubicación (`lat`, `lng`, `zone`, `name`) y capacidad | `POST/PATCH /api/hubs {name, zone, lat, lng, capacity, charging}` |
| 8   | Sistema         | Persiste el hub activo                                                        | `INSERT/UPDATE hubs (active=true)`                                |
| 9   | Operador        | Da de baja un hub                                                             | `DELETE /api/hubs/{id}`                                           |
| 10  | Sistema         | Comprueba que NO haya vehículos asignados antes de bajar                      | `SELECT count(*) FROM vehicles WHERE hub_id = ?`                  |

### Pasos alternos

- **3a.** Editar un vehículo existente: `PATCH /api/vehicles/{id}`; si se le quita el hub, queda `hub_id=NULL` solo si el modo no exige hub físico (venta puede no estar en hub). Se revalida coherencia.
- **5a.** El vehículo ya no se ofrece: "dar de baja" lógico = `UPDATE vehicles SET status='offline'` en vez de `DELETE`, para no romper reservas/compras históricas que referencian el `vehicle_id`.
- **10a.** El operador mueve primero los vehículos a otro hub (paso 3a) y luego baja el hub vacío.

### Excepciones

- **E1.** Dar de baja un hub con vehículos asignados: 409 "no se puede dar de baja un hub con vehículos" (RF-24). El hub NO se desactiva; se resuelve reasignando (10a).
- **E2.** `hub_id` inexistente al crear/editar un vehículo: 422 con la lista de hubs válidos.
- **E3.** Vehículo en modo alquiler sin `rate_per_min_cop`, o en venta sin `price_cop`: 422 (el modo exige su campo económico).
- **E4.** Precio/tarifa ≤ 0 o no entero (COP): 422 (dinero siempre COP entero).
- **E5.** Sin rol `operator`: 403 en toda la ruta (el catálogo lo gobierna solo el operador).

### Reglas de negocio

- RF-24 (dura): no se da de baja/desactiva un hub mientras existan `vehicles` con ese `hub_id` → 409. Es la comprobación del paso 10.
- Un hub admite vehículos hasta su `capacity`; al asignar se valida `count(vehicles WHERE hub_id) ≤ capacity`.
- Dinero en COP entero: `price_cop` (venta) o `rate_per_min_cop` (alquiler); la tarifa por minuto es la base de `rentalCost = ceil(minutos) * rate_per_min_cop` (UC05/UC18), así que se guarda sin redondear.
- `deliverable=true` habilita al vehículo para la modalidad domicilio (UC14); `false` lo deja solo en hub.
- Baja de vehículo preferentemente LÓGICA (`status='offline'`) para preservar el historial de `reservations`/`purchases`/`alert_log` que referencian el `vehicle_id`.
- RNF-08: toda escritura se refleja por API + SSE; un alta nueva se ve en mapa y catálogo sin recompilar nada (el frontend no hardcodea flota).
- Solo lectura para el cliente: el cliente consume el catálogo (UC03/UC06/UC07); escribir es exclusivo de `role='operator'`.

### Fuera de alcance de este caso

- Vender/alquilar el vehículo y cambiar su `status` a `reserved`/`sold`/`in_use` (UC04/UC05/UC08/UC18); aquí el alta nace `available` o `offline`.
- Asignar el vehículo a un domiciliario (UC14), ver la posición en vivo (UC20/UC10).
- La gestión de hubs de recarga como negocio (el campo `charging` solo se registra; no hay RF de operación de carga).
