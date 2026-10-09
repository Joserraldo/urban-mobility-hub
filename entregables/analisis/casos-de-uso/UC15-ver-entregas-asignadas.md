# UC15 — Ver entregas asignadas

| Campo               | Valor                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| ID                  | UC15                                                                                         |
| Actor principal     | Domiciliario                                                                                 |
| Actores secundarios | —                                                                                            |
| Requisito(s)        | RF-25                                                                                        |
| Prioridad           | P2                                                                                           |
| Estimación          | 3 h (HU-15a)                                                                                 |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; domiciliario `../img/04-casos-de-uso-domiciliario.png` |
| Historias           | HU-15a                                                                                       |

**Intención.** Mostrar al domiciliario la lista de entregas que le asignaron (`assigned` o `in_progress`) con dirección, cliente y hora límite, ordenadas por urgencia (deadline más próximo primero), para que sepa qué hacer y en qué orden.

**Precondiciones.**

- El domiciliario tiene sesión iniciada (UC02) con `role='courier'`.
- El operador ya creó entregas con `courier_id` propio (UC14); si no, la lista sale vacía y eso es un resultado válido, no un error.

**Garantías (postcondiciones).**

- El domiciliario ve SOLO las filas de `deliveries` con su `courier_id`; NINGUNA entrega de otro domiciliario aparece en la respuesta.
- La lista siempre viene ordenada por `deadline_at` ascendente; el tiempo restante se calcula contra el reloj del servidor, no del dispositivo.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                 | Datos (tabla / endpoint)                                                                                    |
| --- | --------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | Domiciliario    | Abre "Mis entregas"                                                            | `GET /api/deliveries?courier=me`                                                                            |
| 2   | Sistema         | Valida sesión y resuelve `me` → `courier_id` real                              | token de sesión (UC02)                                                                                      |
| 3   | Sistema         | Consulta sus entregas activas                                                  | `SELECT deliveries WHERE courier_id = me AND status IN ('assigned','in_progress') ORDER BY deadline_at ASC` |
| 4   | Sistema         | Enriquece cada fila con dirección, cliente y vehículo                          | JOIN `reservations` (`address`, `user_id`) + `users` (nombre del cliente) + `vehicles`                      |
| 5   | Sistema         | Devuelve la lista con `deadline_at` y tiempo restante calculado                | JSON; UI con badge de urgencia por entrega                                                                  |
| 6   | Sistema         | Mantiene la lista viva: si UC14 asigna una entrega nueva, aparece sin recargar | SSE (evento de `deliveries`)                                                                                |

### Pasos alternos

- **3a.** No hay entregas asignadas (`0` filas): estado vacío explícito — "No tienes entregas asignadas por ahora" —, no un error ni una pantalla en blanco (HU-15a).
- **5a.** El domiciliario filtra por estado (`assigned` vs `in_progress`): mismo endpoint con `?status=`; el orden por `deadline_at` no cambia.

### Excepciones

- **E1.** Sin sesión o token expirado: 401 antes de la consulta; nunca se lista "en modo fantasma" (patrón de UC18).
- **E2.** Intento de ver entregas ajenas (p. ej. `?courier_id=otro`): el parámetro se IGNORA, `me` siempre se deriva de la sesión; un usuario sin `role='courier'` recibe 403. No existe fuga horizontal por IDOR.

### Reglas de negocio

- Orden SIEMPRE `deadline_at ASC` (las más urgentes primero); `assigned_at ASC` como desempate.
- Tiempo restante = `deadline_at − now(server)`; negativo se muestra como "retrasada N min" (el estado `late` lo pone UC17, la UI solo lo pinta).
- Solo se listan los estados `assigned` e `in_progress`: `delivered` y `late` históricos viven en el detalle, no en la bandeja de trabajo.

### Fuera de alcance de este caso

- Ejecutar la entrega (UC16), asignar o reasignar (UC14), marcar el retraso (UC17).
- La navegación hasta la dirección (la hace el domiciliario con la API de Mapas, fuera del sistema).
