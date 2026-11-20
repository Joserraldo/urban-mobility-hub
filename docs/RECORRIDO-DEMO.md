# Recorrido de la demo como cliente

Guía para probar reserva, desbloqueo (QR + casco) y pago. Base: `http://localhost:8080` (o la URL del túnel `cloudflared`; ver `docs/DEMO-LOCAL.md`).

## Credenciales (seed, contraseña `Demo1234!`)

| Rol                              | Correo                                            |
| -------------------------------- | ------------------------------------------------- |
| Operador                         | `operador@demo.co`                                |
| Cliente                          | `cliente@demo.co` (también `cliente2..5@demo.co`) |
| Cliente con 3 alquileres en vivo | `viajero@demo.co`                                 |
| Domiciliarios                    | `domi1@demo.co`, `domi2@demo.co`, `domi3@demo.co` |

## Qué codifica el QR

Cada vehículo lleva un QR con el texto `UMH:<id>` (por ejemplo `UMH:SC-1150`). El desbloqueo compara ese texto con el vehículo reservado (`POST /api/unlock/sessions/:id/qr`). Si no puedes escanear, escribe ese código completo a mano (con el prefijo `UMH:`) en el campo de ingreso manual; el servidor lo compara tal cual.

## Dónde conseguir los QR

1. En el PC abre `http://localhost:8080/admin`, entra como operador y pulsa la pestaña **Hoja de QR** (o ve directo a `http://localhost:8080/admin/qr`).
2. Filtra por hub, tipo o "Solo alquiler". Cada tarjeta trae el QR, el código para ingreso manual, modelo, estado, batería, hub y "Cómo llegar".
3. **Imprimir** genera 3 tarjetas por fila, sin cabecera. También puedes dejarla en pantalla y escanearla con el celular.
4. Respaldo estático (sin servidor): abre `docs/qr/index.html` en el navegador. Para regenerarlo:

```
npx tsx scripts/generate-qr.ts --out=docs/qr
```

Para un solo vehículo suelto: `http://localhost:8080/api/vehicles/SC-1150/qr.svg`.

## Hubs

| Hub                       | Zona                 | Coordenadas      |
| ------------------------- | -------------------- | ---------------- |
| HUB-01 Hub Cabecera       | Cabecera del Llano   | 7.1193, -73.1090 |
| HUB-02 Hub UNAB El Jardín | Campus Universitario | 7.1098, -73.1066 |
| HUB-03 Hub San Pío        | Centro               | 7.1163, -73.1213 |
| HUB-04 Hub Floridablanca  | Floridablanca        | 7.0621, -73.0869 |

Cada tarjeta de la hoja tiene el enlace de Google Maps (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`).

## Vehículos de alquiler libres para probar

Ejemplos disponibles al arrancar la demo (el estado real lo ves en la hoja de QR): `SC-1171`, `SC-1210` (HUB-01); `SC-1180`, `SC-1181`, `SC-1163` (HUB-02); `SC-1191`, `SC-1212`, `BK-2260` (HUB-03); `SC-1200`, `SC-1213` (HUB-04). Los marcados "Reservado" ya tienen reserva (`SC-1150`, `SC-1172`, `SC-1190`, `SC-1211`, `SC-1042`, `SC-1088`); no los uses.

**En alquiler en vivo** (violeta, a nombre de `viajero@demo.co`, se mueven solos): `SC-1201`, `SC-1202`, `BK-2203`. No se pueden reservar; sirven para ver el mapa y el gemelo digital en `/admin`.

## Flujo del cliente

1. Abre la app en el celular (URL del túnel) o en el PC: `http://localhost:8080/app` e inicia sesión como `cliente@demo.co`.
2. Elige un hub y un vehículo libre; **Reservar** (modalidad hub).
3. **Desbloquear**: escanea el QR de ese vehículo desde la hoja abierta en el PC (o escribe `UMH:<id>`).
4. Paso de casco: ver siguiente sección.
5. Paso de rostro y arranque; el viaje aparece en **Mis reservas**. Al terminar, el pago.

## Prueba de casco con la webcam del PC (mismo vehículo)

1. Arranca todo: `sh scripts/demo-local.sh` (necesita visión en 8090 y `INGEST_KEY`).
2. En el PC: `/admin` como operador, pestaña **Cámara PC**. Elige el MISMO vehículo que reservó el cliente (por ejemplo `SC-1171`), pulsa **Activar webcam** y permite la cámara. Verás "Con casco / Sin casco".
3. En el celular: desbloquea ese vehículo; en el paso de casco se muestra el video de la cámara y decide el veredicto del servidor.
4. Prueba con casco puesto y sin casco para ver ambos resultados.
