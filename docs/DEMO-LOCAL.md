# Demo local (sin VM)

> Guía completa del día de la presentación (checklist, guion, plan B): [`LANZAMIENTO.md`](LANZAMIENTO.md).

Todo corre en este PC: API + web (8080), servicio de visión `umh-vision` (8090, modelo de cascos ONNX) y, si está instalado,
un túnel `cloudflared` para abrirlo desde el celular. La webcam del PC hace de ESP32-CAM del vehículo.

## Arrancar

```
npm install
sh scripts/demo-local.sh
```

El script genera una `INGEST_KEY` por sesión (o usa la de tu entorno), compila `vision-service/dist/server.mjs` si falta, arranca visión y la
API con `UMH_SEED_DEMO=1`, y al salir (Ctrl+C) cierra visión y túnel. Sin `cloudflared` imprime `http://localhost:8080`.
Para cerrar todo a la fuerza: `powershell -File scripts/demo-stop.ps1` (cierra cloudflared y lo que escuche en 8080/8090).
Si quieres ESP32-CAM, exporta antes `INGEST_KEY` (>= 16 caracteres, la misma de su `secrets.h`); el script usa la tuya si existe.
Las llaves de Bold se cargan de `.env.bold` si existe; sin ellas se usa la pasarela simulada.

Probar el modelo sin servidor: `npx tsx scripts/bench-helmet.ts src/assets/domiciliario.jpg`

## Usar la webcam del PC

1. Abre `http://localhost:8080/admin` e inicia sesión como operador (`operador@demo.co` / `Demo1234!`).
2. Sección **Cámara del PC**: elige un vehículo de alquiler, pulsa **Activar webcam** y permite la cámara. Verás "Con casco / Sin casco", confianza y fps.
3. En el celular abre la URL del túnel, inicia sesión como usuario, y desbloquea ese mismo vehículo: el paso de casco muestra el video de la
   cámara y el veredicto del servidor (no el del navegador) decide.

## Decisiones

- La clave de ingesta nunca llega al navegador: el panel envía el JPEG a `POST /api/admin/camera/:vehicleId/frame` (rol operador) y el servidor lo
  reenvía a visión (`UMH_VISION_URL` o `127.0.0.1:8090`) con `x-ingest-key`. Responde 503 si falta `INGEST_KEY` (≥16 caracteres) o visión no responde.
- `x-device-id` hacia visión es el id del vehículo (así lo identifica visión y exige que exista en la BD), no un id fijo "pc-webcam".
- El panel envía a ~640×480, JPEG 0.7, cada ~400 ms y no encola: espera la respuesta anterior.
- Visión escucha solo en 127.0.0.1; la ESP32-CAM real en LAN necesitaría `HOST=0.0.0.0`.
- La webcam requiere `http://localhost` o HTTPS: desde el celular por el túnel (HTTPS) también funciona.

## Alquileres en vivo en la demo

Con `UMH_SEED_DEMO=1` el seed deja 3 vehículos de alquiler **en viaje activo** (`status='in_use'` + reserva `active`) a nombre de `viajero@demo.co` / `Demo1234!` (usuario aparte, para no bloquear al cliente demo): `SC-1201`, `SC-1202` y `BK-2203`. Es idempotente: ids fijos (`RES-DEMO-LIVE-1..3`) y, en cada arranque, se reactivan si el viaje terminó o si la batería quedó bajo 30 %.

- `fleet-sim` solo mueve los `in_use`: trayectoria suave (rumbo que cambia poco, vuelve hacia el centro si se aleja), 12-24 km/h, batería ~3 %/min; bajo 25 % "vuelve al hub" y se recarga a 95 %. Cada tick emite `position` por SSE (`/api/stream`) con `battery` y `speedKmh`, y `applyTelemetry` escribe en `telemetry_log` (1 fila/10 s) para la gráfica del gemelo.
- Colores en el mapa: violeta = en alquiler; gris con anillo naranja = mantenimiento (solo el operador lo ve); verde/ámbar/rojo = disponible según batería o alerta.
- Cliente (`/app`): ve los alquilados en violeta como "En alquiler", con batería y velocidad, sin Reservar/Desbloquear y sin datos del arrendatario.
- Operador (`/admin` > Monitoreo): mapa de flota en vivo con los mismos colores; al tocar un vehículo se abre su gemelo digital (velocidad en vivo y gráfica de telemetría).
