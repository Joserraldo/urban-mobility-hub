# Mantenimiento y telemetría histórica

Módulo del panel del operador (`/admin`, rol `operator`).

## Qué cambió

- **Estado `maintenance`** en `vehicles.status`. Un vehículo en mantenimiento no se reserva, no se compra, no se desbloquea y no aparece en el mapa ni en el catálogo del cliente (`GET /api/vehicles` lo oculta salvo al operador; `MobilityApp` lo filtra también). Sí aparece en el panel del operador.
- **Tabla `maintenance_orders`** (id, vehicle_id, reason, notes, opened_at/by, closed_at/by, resolution). Una orden abierta (`closed_at IS NULL`) por vehículo.
- **Tabla `telemetry_log`** (vehicle_id, ts, lat, lng, battery, speed_kmh, helmet_on, impact_g, alert). La escribe `applyTelemetry` (`fleet-sim.ts`) con throttle de 1 fila por vehículo cada 10 s y poda de lo anterior a 24 h.
- **Migración**: `migrateVehicleStatus` (`src/server/db/index.ts`) recrea `vehicles` si su CHECK no incluye `'maintenance'` (create new, copy, drop, rename, con `foreign_keys` apagado y en transacción). Es idempotente y corre antes de `schema.sql`, así `data/umh.db` se actualiza sola al arrancar. En D1 el mismo `schema.sql` aplica a una BD nueva; para una existente hay que repetir la recreación como migración.
- **Corrección**: `PATCH /api/admin/vehicles/:id/status` ahora responde 409 si el vehículo está `in_use` y se pide `offline` o `maintenance`.
- **Tipos**: `VehicleStatus` unificado a `in_use` (antes `domain.ts` usaba `in-use`).

## Flujo de estados

```
available / reserved / offline --(POST .../maintenance)--> maintenance --(POST .../close)--> available
in_use  --> 409 (hay que esperar a que termine el viaje)      sold --> 409
```

- Enviar a mantenimiento cancela las reservas abiertas del vehículo (todo o nada) y emite el evento `vehicle` del stream. La alerta NO se limpia al abrir: se pone en `ok` al cerrar la orden.
- Cerrar la orden: `status = available`, `alert_state = ok`.

## Endpoints (todos `operator`)

| Método y ruta                                                 | Uso                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `POST /api/admin/vehicles/:id/maintenance` `{reason, notes?}` | Abre orden (201). 409 si in_use, sold u orden abierta; 422 sin motivo |
| `POST /api/admin/maintenance/:orderId/close` `{resolution}`   | Cierra orden (409 si ya estaba cerrada)                               |
| `GET /api/admin/maintenance`                                  | `{open[], closed[≤50]}` con modelo y tipo del vehículo                |
| `GET /api/admin/vehicles/:id/telemetry?minutes=60`            | Historial (1 a 1440 min)                                              |

Decisión: el `PATCH .../status` con `maintenance` se acepta y crea la orden con motivo "Retiro manual" (así el select de estado del catálogo no deja huecos); salir de mantenimiento por PATCH cierra la orden con "Cierre manual". Contrato completo en `docs/api/openapi.yaml`.

## UI

`/admin` usa `Tabs`: **Monitoreo** (KPIs, simulador, flota, gemelo, bitácora), **Mantenimiento** (`MaintenancePanel`), **Catálogo** y **Entregas**. Para sumar otra pestaña (p. ej. Cámara PC) se agrega un elemento a `extraTabs` en `src/routes/admin.tsx`. Los KPIs incluyen "En mantenimiento". El gemelo digital muestra el estado del vehículo, el botón "Enviar a mantenimiento" (resaltado si hay alerta de caída o batería crítica) y una mini gráfica de batería y velocidad de la última hora.

Capa de datos: `listMaintenance`, `sendToMaintenance`, `closeMaintenance`, `vehicleTelemetry` en `datasource.ts`, implementadas en `api.ts` y `mock.ts` (el mock sintetiza la serie de telemetría); hooks `useMaintenance`, `useMaintenanceActions`, `useVehicleTelemetry` en `queries.ts`.

## Cómo probarlo

1. `npm test` (incluye `tests/integration/mantenimiento.test.ts`: in_use rechazado, cierre deja available, throttle, poda, migración).
2. `UMH_SEED_DEMO=1 npm run dev:api`, login `operador@demo.co` / `Demo1234!`, luego con la cookie: enviar un vehículo a mantenimiento, comprobar que `GET /api/vehicles` sin sesión ya no lo lista, cerrar la orden y pedir `/telemetry`.
3. En el navegador: `/admin` > Mantenimiento.

## Límites conocidos

- El historial vive en SQLite local; no hay gráfica de más de 24 h.
- El diagrama `22-estados-vehiculo.puml` se actualizó sin regenerar las imágenes.
