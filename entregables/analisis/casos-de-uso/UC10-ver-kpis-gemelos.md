# UC10 — Ver KPIs y gemelos digitales

| Campo               | Valor                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC10                                                                                                                                     |
| Actor principal     | Operador                                                                                                                                 |
| Actores secundarios | — (SSE del backend; misma fuente que el mapa)                                                                                            |
| Requisito(s)        | RF-13 (KPIs), RF-14 (gemelos digitales), RF-17 (el tablero y el mapa comparten fuente)                                                   |
| Prioridad           | P1                                                                                                                                       |
| Estimación          | 3 h (HU-10a)                                                                                                                             |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; operador `../img/03-casos-de-uso-operador.png`; estados `../../diseno/img/07-estados-vehiculo.png` |
| Historias           | HU-10a                                                                                                                                   |

**Intención.** Dar al operador una foto en vivo de la flota —cuántos vehículos responden, cuántos hubs operan, batería promedio y alertas abiertas— junto con la tabla de gemelos digitales que reproduce, con los mismos datos, lo que se ve en el mapa.

**Precondiciones.**

- El operador tiene sesión (UC02) con `role='operator'`.
- Existen filas en `vehicles` y `hubs` (sembradas o gestionadas por UC13).
- El backend publica SSE; el gemelo digital (o su simulador, UC11/UC20) va actualizando `vehicles`.

**Garantías (postcondiciones).**

- El tablero NO crea ni modifica datos: solo lee `vehicles`/`hubs`/`alert_log` y se refresca por SSE. Es de solo lectura.
- Los KPIs y la tabla salen de la MISMA consulta y del MISMO stream que alimenta el mapa (RF-17): no puede haber un vehículo "en verde" en la tabla y "apagado" en el mapa.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                               | Datos (tabla / endpoint)                                                      |
| --- | --------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Operador        | Abre `/admin` (KPIs + gemelos)                                                               | sesión con `role='operator'`                                                  |
| 2   | Sistema         | Calcula los KPIs de la flota                                                                 | `SELECT` sobre `vehicles`/`hubs`/`alert_log`                                  |
| 3   | Sistema         | Pinta las tarjetas: vehículos conectados · hubs activos · batería promedio · alertas activas | UI                                                                            |
| 4   | Sistema         | Carga la tabla de gemelos digitales                                                          | `SELECT vehicles (id, model, status, alert_state, battery, lat, lng, hub_id)` |
| 5   | Sistema         | Se suscribe al SSE (la misma fuente que el mapa, RF-17)                                      | `GET /api/events` (SSE)                                                       |
| 6   | Sistema         | Cada evento de telemetría refresca tarjetas y filas en vivo                                  | KPIs y tabla se actualizan sin recargar                                       |

### Pasos alternos

- **3a.** Flota vacía: las tarjetas muestran `0`/`—` con mensaje "sin datos todavía", no es error.
- **5a.** El operador filtra o agrupa la tabla por hub, zona o estado (`available`/`reserved`/`in_use`/`offline`) para acotar los KPIs a una región.
- **4a.** Ordenar la tabla por batería ascendente o por `alert_state ≠ sin_novedad` para priorizar la atención.

### Excepciones

- **E1.** Sin rol `operator`: 403 antes del paso 2 (el tablero es solo de operador; hereda del cliente pero la ruta está protegida).
- **E2.** SSE caído: la tabla queda con la última instantánea y marca los vehículos cuyo `position_age` supera `POSITION_MAX_AGE_MS = 5000` ms como **stale** (posición vieja); no se inventan valores frescos.
- **E3.** Vehículo sin última posición (nunca reportó): aparece `status='offline'` con batería/posición `null`; la batería promedio lo excluye del denominador.

### Reglas de negocio

- RF-17: gemelos = mapa = MISMA fuente. KPIs y tabla leen `vehicles` y se refrescan por SSE; una sola consulta de origen, cero duplicación.
- "Conectado" = posición fresca (`now - last_ts ≤ POSITION_MAX_AGE_MS`, 5 s); lo demás cuenta como `offline`/stale.
- Batería promedio = media de `vehicles.battery` de los conectados; entero de porcentaje, redondeo hacia abajo.
- Hubs activos = `hubs.active = true` (los desactivados por UC13 no cuentan).
- Alertas activas = `vehicles.alert_state ≠ 'sin_novedad'` (RF-11: los cinco estados del vehículo; ver UC12/UC20). El KPI es un conteo, no un reemplazo de la bitácora.
- Solo lectura: este caso jamás hace `UPDATE`/`INSERT` sobre `vehicles`/`hubs`.

### Fuera de alcance de este caso

- Inyectar telemetría de prueba (UC11) y recibir la real (UC20).
- La bitácora de alertas con historial y filtros (UC12).
- El mapa multi-capa del cliente (UC06) y la edición del catálogo/hubs (UC13).
