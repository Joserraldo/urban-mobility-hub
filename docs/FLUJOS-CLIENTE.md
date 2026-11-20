# Flujos del cliente: reservar, pagar, desbloquear, viajar

## Flujo

1. `POST /api/reservations`: crea la reserva `requested` y deja el vehículo `reserved`.
2. `POST /api/payments` (`ownerType: reservation`): cobra el prepago de $ 10.000.
   - Pasarela simulada: aprueba al instante y registra el pago `base`.
   - Bold: abre el checkout; el webhook o el sondeo de `GET /api/payments/bold/:orderId` llama a `finalizeBoldOrder`, que registra el pago `base` aprobado.
3. La reserva **sigue en `requested`** tras pagar. «Pagada» no es un estado: es tener un pago `base` aprobado, y la lista `GET /api/reservations` lo expone como `prepaid`.
4. `POST /api/unlock/sessions`: exige reserva `requested` propia **y** prepago aprobado (402 si no; ahora también con la pasarela simulada).
5. Sesión: `qr` -> `helmet` -> `ready` -> `start` (reserva `active`, vehículo `in_use`).
6. `POST /api/trips/:id/end`: cobra el viaje (con Bold, cuando el webhook confirma); reserva `completed`, vehículo `available`.

El QR pegado al vehículo contiene `UMH:<id>` (`/api/vehicles/:id/qr.svg`, siempre el contenido canónico). A mano se acepta `UMH:SC-1171`, `SC-1171` o `sc-1171` con espacios.

## Qué estaba roto

- `src/routes/mis-reservas.tsx` ofrecía «Iniciar» en las reservas `requested`; ese botón llamaba a `transitionReservation(id, "start")`, que en `src/lib/data/api.ts` siempre lanza «El viaje inicia desbloqueando el vehículo». Era el único botón visible tras pagar y no desbloqueaba nada.
- Ninguna pantalla llevaba de una reserva al flujo de desbloqueo: `UnlockFlow` solo se abría desde un vehículo en el mapa. Tras «aprobado» el diálogo decía «recógelo en su hub» sin decir dónde ni ofrecer el botón.
- Se acumulaban reservas `requested` sin pagar (cada intento abandonado dejaba una y el vehículo apartado); la lista las mezclaba con la reserva pagada y `createUnlockSession` podía tomar una sin pagar del mismo vehículo (402 en Bold).
- Con la pasarela simulada el desbloqueo no verificaba el pago.
- El QR impreso usaba `qr_code` de la BD y el servidor validaba `UMH:<id>`; si divergían, el QR impreso no servía. El ingreso manual exigía el prefijo `UMH:` exacto.

## Cómo se arregló

- Servidor (`src/server/api/handlers.ts`): prepago obligatorio siempre; `prepaid` en la lista; `releaseUnpaidReservations`.
- Política de reservas sin pagar: **máximo 1 abierta sin pagar por cliente**. Al crear una nueva se cancelan las anteriores sin pagar (se libera su vehículo); además, al listar se cancelan las de más de 30 min. No se tocan las pagadas, las de domicilio con entrega asignada ni las que tienen un pago Bold en curso (< 30 min). Esto también limpia las `requested` viejas de la BD de la demo la primera vez que el cliente abre sus reservas; el seed no crea reservas `requested` para el cliente demo (solo entregas de otros clientes).
- Desbloqueo (`src/server/domain/unlock.ts`, `UnlockFlow.tsx`): código aceptado como `UMH:<id>` o solo `<id>`, sin distinguir mayúsculas ni espacios; el cliente lo normaliza a `UMH:<id>`.
- UI: `ReservationCard` (vehículo, ubicación, estado del prepago, **Desbloquear** / **Pagar prepago** / **Finalizar**, **Cómo llegar** a Google Maps con lat,lng del vehículo, **Cancelar**) usada en `/mis-reservas` (abiertas primero; completadas y canceladas colapsadas en «Historial») y en el panel `MyOpenReservations` del mapa `/app`. `ReserveDialog` ahora ofrece «Desbloquear ahora» y «Cómo llegar» al confirmar; la lista de un hub ofrece «Reservar».
- Datos: `Reservation.paid`, `DataSource.payReservation(id)` (reintento de pago), `createUnlockSession` prefiere la reserva pagada.

## Camino Bold

Tras `SALE_APPROVED` (o `APPROVED`/`PAID` por sondeo) `finalizeBoldOrder` registra el pago `base` aprobado, que es justo lo que lee el 402 del desbloqueo: queda coherente sin cambiar el estado de la reserva. Si el pago vence, `finalizeBoldOrder` cancela la reserva y libera el vehículo. Cubierto en `tests/integration/bold.test.ts` («tras el webhook APPROVED...»).

## Cómo probar

- Unitarias/integración: `npm test` (`tests/integration/flujo-cliente.test.ts`, `tests/integration/bold.test.ts`).
- E2E contra una instancia aislada sin Bold (pago simulado):
  1. `UMH_DB_PATH=/ruta/test.db UMH_SEED_DEMO=1 VITE_SSR_API_BASE=http://localhost:8081 npx vite --mode api --port 8081 --strictPort`
  2. `BASE_URL=http://localhost:8081 npx playwright test tests/e2e/reserva-desbloqueo.spec.ts --project=desktop`

  Cubre reservar -> pagar -> Desbloquear/Cómo llegar -> código a mano -> casco (simulación del cliente) -> viaje -> finalizar, el límite de reservas sin pagar y la compra de un vehículo en venta. Las capturas van a `SHOTS_DIR`.

- Con Bold (sandbox) a mano: reservar, pagar con la tarjeta de prueba, y en «Mis reservas» debe aparecer «Lista para desbloquear».
