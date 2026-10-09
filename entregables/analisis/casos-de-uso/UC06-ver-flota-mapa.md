# UC06 — Ver flota y mapa multicapa

| Campo               | Valor                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| ID                  | UC06                                                                               |
| Actor principal     | Cliente                                                                            |
| Actores secundarios | API de Mapas (OSM); Vehículo IoT / gemelo digital (fuente de telemetría)           |
| Requisito(s)        | RF-04, RF-08; RNF-01                                                               |
| Prioridad           | P1                                                                                 |
| Estimación          | 5 h (HU-06a..b)                                                                    |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png` |
| Historias           | HU-06a, HU-06b                                                                     |

**Intención.** Mostrar en un mapa, en vivo, los vehículos de alquiler disponibles, los hubs y el stock en venta, y mantener cada posición reflejada en ≤ 5 s desde su telemetría por suscripción a tiempo real.

**Precondiciones.**

- VER el mapa no exige sesión (es público); alquilar desde un marcador sí (UC05).
- El sistema ya recibió al menos un snapshot de la flota.

**Garantías (postcondiciones).**

- El primer evento del stream es un snapshot completo; después llegan solo deltas.
- Un vehículo `mode='rent'` en movimiento aparece reubicado en ≤ 5 s desde su telemetría (RNF-01).
- Tres capas conmutables: vehículos de alquiler disponibles, hubs y stock en venta.

### Flujo principal (camino feliz)

| #   | Actor → Sistema   | Acción / respuesta del sistema           | Datos (tabla / endpoint)                                                        |
| --- | ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Cliente           | Abre `/app` (vista mapa)                 | `GET /api/vehicles?mode=rent` + `GET /api/hubs` + `GET /api/vehicles?mode=sale` |
| 2   | Sistema           | Projeta lat/lng con el cuadro geográfico | `GET /api/map/config` (center/bounds/defaultZoom)                               |
| 3   | Sistema           | Pinta las capas sobre el mapa base (OSM) | API de Mapas (tiles + proyección)                                               |
| 4   | Cliente           | Se suscribe a tiempo real                | `GET /api/stream` (SSE `text/event-stream`; `/api/ws` alterno)                  |
| 5   | Sistema           | Envía el snapshot inicial                | primer `data:` = estado completo de la flota                                    |
| 6   | Vehículo (gemelo) | Emite telemetría (fuera del mapa)        | `POST /api/ingest` / MQTT `umh/vehicle/{id}/telemetry` (UC20)                   |
| 7   | Sistema           | Publica el delta de posición             | `RealtimeEvent` → el marcador se mueve en ≤ 5 s                                 |
| 8   | Cliente           | Filtra por capa o toca un marcador       | abre UC05 (alquilar), UC03/UC04 (venta), UC07 (detalle hub)                     |

### Pasos alternos

- **4a.** WebSocket indisponible (despliegue sin puerto ws): se usa SSE; `GET /api/realtime/config` informa `wsUrl` (puede ser null) y `sseUrl`.
- **3a.** El cliente marca "solo disponibles": el filtro aplica sobre `status='available'` en el cliente, sin recargar.

### Excepciones

- **E1.** Telemetría caída: los marcadores no desaparecen; quedan en su última posición y, si el vehículo reporta `perdida_gps`, se pinta con su `alert_state` (UC20/UC12). El mapa degrada, no se rompe.
- **E2.** La conexión SSE se corta: el cliente reconecta con backoff y vuelve a recibir snapshot; no duplica marcadores.
- **E3.** `lat/lng` fuera del cuadro de `map/config`: se clampa la vista; el marcador no se pierde.

### Reglas de negocio

- RNF-01: ≤ 5 s entre la generación de posición (gemelo) y su reflejo en el mapa — única medida de RF-08.
- Capa alquiler = `mode='rent'`; capa venta = `mode='sale'`; capa hubs = `active=1`. Un vehículo `'sold'` sale de la vista.
- La posición NACE del gemelo (UC20) y llega por el stream; el navegador no la inventa.
- API de Mapas (OSM) es externa: solo tiles y proyección, nunca estado del negocio.

### Fuera de alcance de este caso

- Alquilar o comprar desde el marcador (UC05/UC04) y la ficha del hub (UC07).
- Generar la telemetría y evaluar las alertas (UC20, UC11).
