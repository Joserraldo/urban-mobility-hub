# UC07 — Ver detalle de hub

| Campo               | Valor                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| ID                  | UC07                                                                               |
| Actor principal     | Cliente                                                                            |
| Actores secundarios | —                                                                                  |
| Requisito(s)        | RF-07                                                                              |
| Prioridad           | P2                                                                                 |
| Estimación          | 2 h (HU-07a)                                                                       |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png` |
| Historias           | HU-07a                                                                             |

**Intención.** Mostrar la ficha de un hub: capacidad, ocupados (calculado), vehículos en carga y el desglose de unidades disponibles para alquiler y para venta en ese hub.

**Precondiciones.**

- El hub existe en `hubs` (se llega desde el mapa UC06 o desde `/hubs/{hubId}`).
- VER la ficha es público (sin sesión).

**Garantías (postcondiciones).**

- `ocupados` es CALCULADO por la API (COUNT de vehículos presentes en el hub), NO una columna de `hubs`.
- La ficha separa alquiler (`mode='rent'`) y venta (`mode='sale'`) disponibles.
- Nunca se muestra `ocupados > capacity`.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                         | Datos (tabla / endpoint)                                                                                       |
| --- | --------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1   | Cliente         | Abre la ficha de un hub                                | `GET /api/hubs/{id}` (o `/hubs/{hubId}`)                                                                       |
| 2   | Sistema         | Lee los datos del hub                                  | `SELECT hubs WHERE id=:id` (name, zone, lat, lng, capacity, charging, active)                                  |
| 3   | Sistema         | Calcula la ocupación                                   | `SELECT COUNT(*) FROM vehicles WHERE hub_id=:id AND status IN ('available','reserved','offline')` → `occupied` |
| 4   | Sistema         | Lista vehículos de alquiler disponibles                | `SELECT vehicles WHERE hub_id=:id AND mode='rent' AND status='available'`                                      |
| 5   | Sistema         | Lista vehículos en venta disponibles                   | `SELECT vehicles WHERE hub_id=:id AND mode='sale' AND status='available'`                                      |
| 6   | Sistema         | Pinta capacidad vs ocupados, en carga y las dos listas | UI `HubDetail {occupied, charging, rentVehicles, saleVehicles}`                                                |

### Pasos alternos

- **6a.** Hub lleno: si `occupied >= capacity`, se marca "lleno" y no se admiten vehículos nuevos hasta liberar un slot (RF-24).
- **1a.** El cliente entra por `/hubs` (lista) y elige uno: misma ficha por `id`.

### Excepciones

- **E1.** Hub inexistente: 404 `NOT_FOUND`.
- **E2.** Hub `active=0` (inactivo): la ficha se muestra pero no ofrece alquilar ahí.
- **E3.** Sin vehículos presentes (todos en viaje/entrega): las listas salen con estado vacío y `occupied` refleja solo los presentes (no cuenta los que están fuera del hub).

### Reglas de negocio

- `capacity` y `charging` se leen de la fila `hubs` (columnas). `occupied` NO es columna: se deriva de `vehicles.hub_id` en la API. Persistir `occupied` desnormalizaría y mentiría en cuanto un vehículo sale del hub.
- Predicado de "presente en el hub" (`status IN ('available','reserved','offline')`): el diseño concreta qué estados cuentan; en viaje (`'in_use'`) o en reparto a domicilio NO ocupan slot.
- `en carga` = `hubs.charging`.
- Un hub inactivo no borra sus vehículos; darlo de baja con unidades asignadas se bloquea en UC13 (RF-24).

### Fuera de alcance de este caso

- Alquilar o comprar un vehículo del hub (UC05/UC04).
- Editar capacidad/estado del hub (UC13, RF-24).
- Ver la posición del hub en el mapa (UC06); aquí solo se abre la ficha.
