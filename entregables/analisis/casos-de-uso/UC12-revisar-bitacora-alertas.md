# UC12 — Revisar bitácora de alertas

| Campo               | Valor                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC12                                                                                                                                                                                           |
| Actor principal     | Operador                                                                                                                                                                                       |
| Actores secundarios | — (SSE; origen de las filas: UC20 `telemetry` o UC11 `simulator`)                                                                                                                              |
| Requisito(s)        | RF-12 (bitácora de alertas); RNF-04 (log auditable, solo-append)                                                                                                                               |
| Prioridad           | P1                                                                                                                                                                                             |
| Estimación          | 3 h (HU-12a)                                                                                                                                                                                   |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; operador `../img/03-casos-de-uso-operador.png`; secuencia `../../diseno/img/05-secuencia-alerta.png`; estados `../../diseno/img/07-estados-vehiculo.png` |
| Historias           | HU-12a                                                                                                                                                                                         |

**Intención.** Consultar el historial completo y ordenado de alertas de la flota, con su origen, vehículo, tipo y marca de tiempo, sabiendo que el registro es append-only (no se edita ni se borra) y que cada alerta nueva aparece en menos de un segundo.

**Precondiciones.**

- El operador tiene sesión (UC02) con `role='operator'`.
- Existe al menos una fila en `alert_log` (UC20 `origin='telemetry'` o UC11 `origin='simulator'`).
- El backend publica SSE con las alertas recién creadas.

**Garantías (postcondiciones).**

- Este caso es de SOLO LECTURA sobre `alert_log`: no emite `UPDATE` ni `DELETE`; lo que se ve es fiel a lo que insertaron UC20/UC11.
- Toda alerta del sistema (real o simulada) está aquí; ninguna alerta escapa a la bitácora (UC20/UC11 `«include»` este caso).

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                        | Datos (tabla / endpoint)                   |
| --- | --------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Operador        | Abre "Bitácora de alertas" en `/admin`                                | `GET /api/alerts`                          |
| 2   | Sistema         | Lee el historial ordenado por fecha                                   | `SELECT * FROM alert_log ORDER BY at DESC` |
| 3   | Sistema         | Pinta vehicle, tipo, lat/lng, `at` y origen (`telemetry`/`simulator`) | tabla paginada                             |
| 4   | Operador        | Filtra por vehículo, tipo o `hub`                                     | `SELECT ... WHERE vehicle_id=? AND type=?` |
| 5   | Sistema         | Aplica el filtro y re-pagina                                          | UI                                         |
| 6   | Sistema         | Toda alerta nueva aparece arriba en tiempo real                       | SSE (`< 1 s`, RNF-02)                      |

### Pasos alternos

- **3a.** El operador abre un registro y ve el detalle completo (coordenada, `origin`, vehículo y su estado actual) enlazando al gemelo en el mapa (UC10).
- **4a.** Ordenar por tipo o por origen para auditar solo eventos simulados (UC11) o solo reales (UC20).

### Excepciones

- **E1.** Sin `role='operator'`: 403; el log es del operador, no del cliente.
- **E2.** Sin alertas que cumplan el filtro: tabla vacía con "sin resultados", no es error.
- **E3.** SSE caído: la bitácora sigue íntegra porque `alert_log` se persiste PRIMERO que la notificación; al reconectar, el `SELECT` (paso 2) recupera lo que no se vio en vivo.
- **E4.** Si un intento de edición/borrado llegara por API: se rechaza (no existe `PATCH/DELETE /api/alerts`); la única mutación permitida es `INSERT` desde UC20/UC11.

### Reglas de negocio

- **Append-only (RNF-04):** las filas de `alert_log` no se modifican ni se eliminan. "Corregir" una alerta = insertar una nueva; el historial anterior queda intacto para auditoría.
- Cada fila lleva `id, vehicle_id, type ∈ {no_helmet, crash, gps_lost, low_battery}, lat, lng, at, origin ∈ {telemetry, simulator}`. El `origin` diferencia la vía real (UC20) de la simulada (UC11) sin mezclarlas.
- `type` usa el token con guion bajo (`no_helmet`, `gps_lost`) al persistir; el dominio devuelve el token con guion medio (`no-helmet`, `gps-lost`) desde `evaluateTelemetry` — la capa de ingestión hace el mapeo, la bitácora siempre muestra el persistido.
- Orden por defecto `at DESC` (lo más reciente arriba); `at` es el reloj del servidor.
- Latencia de aparición `< 1 s` garantizada por SSE (RNF-02), no por refresco manual.

### Fuera de alcance de este caso

- Generar/evaluar las alertas (UC20 real, UC11 simulada) y cambiar `vehicles.alert_state` (allí ocurre, no aquí).
- Notificar al cliente o al operador por otros canales (no hay RF; hoy solo se ve en `/admin`).
- Reconocimiento/escalado ("ack") de alertas (no hay RF; el operador actúa desde el tablero, UC10).
