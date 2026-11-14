# Seeder de datos demo

Hay **dos niveles** de siembra, ambos sobre SQLite (`UMH_DB_PATH`):

| Nivel     | Archivo                                       | Cuándo corre                            | Contenido                                                        |
| --------- | --------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| Mínimo    | `src/server/db/seed.ts` (`seedIfEmpty`)       | Siempre, si la tabla `users` está vacía | 4 hubs, 11 vehículos (de `src/lib/data/mock.ts`), 5 cuentas demo |
| Demo rico | `src/server/db/seed-demo.ts` (`seedDemoData`) | Solo con `UMH_SEED_DEMO=1`, idempotente | Lo de abajo                                                      |

El nivel rico va aparte para no alterar las pruebas, que asumen una base mínima.

## Qué agrega `UMH_SEED_DEMO=1`

- **4 usuarios**: `cliente3@demo.co`, `cliente4@demo.co`, `cliente5@demo.co` y el domiciliario
  `domi3@demo.co` (todos con consentimiento de datos personales).
- **6 dispositivos nuevos** (17 en total): `SC-1150`, `SC-1163`, `BK-2260`, `DR-3330` (alquiler)
  y `SV-5005`, `SV-5006` (venta).
- **Historial**: 6 viajes completados, cada uno con pago `base` (prepago de $5.000) y `cargo_viaje`.
- **3 entregas a domicilio**: una entregada a tiempo, una `late` y una `in_progress`.
- **1 compra pagada** (`SV-5004`, que pasa a `sold`).
- **4 alertas IoT** (sin casco, batería baja, GPS perdido, impacto).
- **1 notificación** de correo `entrega_tardia` en estado `simulated`.

Cuentas (contraseña de todas: `Demo1234!`): `cliente@demo.co`, `cliente2@demo.co`,
`cliente3@demo.co` … `cliente5@demo.co`, `operador@demo.co`, `domi1@demo.co` … `domi3@demo.co`.

## Cómo usarlo

Local:

```bash
UMH_SEED_DEMO=1 npm run dev:api
```

En la VM (base nueva o reiniciada):

```bash
sudo systemctl stop umh
sudo rm -f /var/lib/umh/umh.db /var/lib/umh/umh.db-*
echo "UMH_SEED_DEMO=1" | sudo tee -a /etc/umh/umh.env
sudo systemctl start umh
```

Sobre una base que ya tiene los 5 usuarios mínimos, activar la variable y reiniciar basta:
solo agrega lo que falta (si existe `cliente3@demo.co` no hace nada).

## Cómo probarlo

`npm test` incluye `tests/unit/seed-demo.test.ts` (conteos y doble ejecución sin duplicar).
Resultado esperado en `/admin`: 17 vehículos conectados, 4 alertas y 2 entregas en curso
(ver `capturas/06-admin-panel.png`).

## Decisiones

- Los usuarios demo comparten contraseña conocida: **solo para demo**, nunca con datos reales.
- La notificación sembrada queda `simulated` a propósito; el envío real ocurre cuando una entrega
  se marca tarde (UC17/UC19) y hay llave de Brevo autorizada.
