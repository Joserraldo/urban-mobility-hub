# Despliegue en la VM (producción)

Estado actual: **desplegado y funcionando** en `https://urbanmobility.duckdns.org`
(IP `57.156.68.204`, Ubuntu 24.04, Node 24, Nginx + Let's Encrypt, SQLite local).

## Arquitectura

```
Internet
  │  80/443
  ▼
Nginx  ──proxy──►  Node 24 (systemd: umh.service)  ──►  SQLite /var/lib/umh/umh.db
                    .output/server/index.mjs
                    /api/* + SSR en el mismo proceso
```

- El backend (`/api/*`, SSE) ahora se monta en `src/server.ts` **también en el build de
  producción**. Antes solo existía en `npm run dev:api` y el build devolvía 404 en `/api/*`.
- El build se hace **en local** y se sube comprimido: la VM tiene 2 vCPU y 887 MB de RAM
  (con 2 GB de swap); compilar ahí es innecesario y lento.
- La app escucha en `0.0.0.0:8080`; Nginx publica 80/443. El puerto 8080 no está
  accesible desde Internet en esta VM, así que la URL pública es solo el dominio.

## Puertas de calidad ejecutadas antes de desplegar

```bash
npm ci
npm run typecheck     # 0 errores
npm run lint          # 0 errores (7 warnings de shadcn)
npm test              # 97/97
NITRO_PRESET=node_server VITE_SITE_URL=https://urbanmobility.duckdns.org \
  npx vite build --mode api
```

## Variables de entorno

Van en `/etc/umh/umh.env` (root:umh, 640). **Nunca** se suben al repositorio.

| Variable             | Valor / uso                                           |
| -------------------- | ----------------------------------------------------- |
| `NODE_ENV`           | `production`                                          |
| `PORT`               | `8080`                                                |
| `HOST`               | `0.0.0.0`                                             |
| `UMH_INTERNAL_URL`   | `http://127.0.0.1:8080` (fetch del SSR contra el API) |
| `UMH_DB_PATH`        | `/var/lib/umh/umh.db`                                 |
| `UMH_SESSION_SECRET` | secreto aleatorio de 32 bytes (HMAC de sesión)        |
| `UMH_DATA_KEY`       | secreto aleatorio de 32 bytes (datos sensibles)       |
| `BREVO_API_KEY`      | opcional; sin ella el correo queda en `simulated`     |
| `BREVO_SENDER`       | opcional; remitente verificado en Brevo               |

## Desplegar una versión nueva

Desde la raíz del repo, en local:

```bash
NITRO_PRESET=node_server VITE_SITE_URL=https://urbanmobility.duckdns.org \
  npx vite build --mode api

tar -czf /tmp/umh-release.tar.gz .output src/server/db/schema.sql
scp -i vmingsoftwareiijose_key.pem /tmp/umh-release.tar.gz \
  azureuser@57.156.68.204:/home/azureuser/
```

En la VM:

```bash
sudo systemctl stop umh
sudo rm -rf /opt/umh/.output /opt/umh/src
sudo tar -xzf /home/azureuser/umh-release.tar.gz -C /opt/umh
sudo chown -R root:root /opt/umh
sudo chmod -R a+rX /opt/umh
sudo systemctl start umh
curl -s https://urbanmobility.duckdns.org/api/health
```

La base de datos **no se toca** en un despliegue normal (está fuera de `/opt/umh`).
Para reiniciar la demo a los datos sembrados:

```bash
sudo systemctl stop umh
sudo rm -f /var/lib/umh/umh.db /var/lib/umh/umh.db-*
sudo systemctl start umh
```

## Archivos de sistema

- `deploy/umh.service` → `/etc/systemd/system/umh.service`
- `deploy/nginx-umh.conf` → `/etc/nginx/sites-available/umh` (TLS gestionado por Certbot)
- Certificado: `/etc/letsencrypt/live/urbanmobility.duckdns.org/` (renovación automática)

```bash
sudo systemctl status umh nginx
sudo journalctl -u umh -n 100 --no-pager
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

## Verificación rápida (smoke)

```bash
curl -s https://urbanmobility.duckdns.org/api/health
# {"ok":true,"source":"sqlite","db":"/var/lib/umh/umh.db"}

curl -s -c /tmp/c.txt -X POST https://urbanmobility.duckdns.org/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"cliente@demo.co","password":"Demo1234!"}'

curl -s -b /tmp/c.txt https://urbanmobility.duckdns.org/api/vehicles | head -c 200
timeout 3 curl -s -N https://urbanmobility.duckdns.org/api/stream
```

Cuentas demo: `cliente@demo.co`, `operador@demo.co`, `domi1@demo.co` — contraseña `Demo1234!`.

## Seguridad

- La llave SSH (`*.pem`) está en `.gitignore` y **no** se versiona.
- Secretos de sesión/datos generados en la VM, no en el repo.
- En producción el proceso **no arranca** si faltan `UMH_SESSION_SECRET` o `UMH_DATA_KEY`
  (fail-fast), y la cookie de sesión se emite con `Secure` (solo HTTPS).
- El servicio corre como usuario de sistema `umh` con `ProtectSystem=strict`,
  `ProtectHome=true` y escritura limitada a `/var/lib/umh`.
- HTTP redirige a HTTPS y el dominio envía HSTS (`Strict-Transport-Security`).

## Cámara de casco del vehículo (ESP32-CAM + `umh-vision`)

El casco del desbloqueo (UC09) lo puede decidir la **cámara montada en el vehículo**, no solo el navegador:

```
ESP32-CAM ──JPEG por HTTPS──► Nginx /api/camera/frame ──► umh-vision (127.0.0.1:8090, modelo YOLOv8 ONNX)
                                                              │ último veredicto por vehículo
API (umh.service) ◄── GET 127.0.0.1:8090/api/camera/latest ───┘   (src/server/services/camera.ts)
```

- En `POST /api/unlock/sessions/:id/helmet`, si la cámara del vehículo mandó un fotograma en los últimos 5 s,
  **su veredicto manda** y lo que declare el navegador se ignora (la respuesta trae `helmetSource: "camera"`).
  Sin cámara se mantiene la IA del navegador (la demo no se rompe). `UMH_REQUIRE_CAMERA=1` obliga a usar la cámara.
- `GET /api/vehicles/:id/camera` → `{ online, required }`; la pantalla de desbloqueo lo consulta cada 2 s.
- Variables nuevas del API (opcionales): `UMH_VISION_URL` (por defecto `http://127.0.0.1:8090`) y `UMH_REQUIRE_CAMERA`.
- Servicio `umh-vision`: código en `vision-service/`, unidad en `vision-service/deploy/umh-vision.service`,
  entorno en `/etc/umh/vision.env` (`INGEST_KEY` ≥ 16 caracteres), modelo en `/opt/umh-vision/models/`
  (ver `models/README.md`). Detalle y comandos en `vision-service/README.md`.
- Firmware de la placa y configuración del Wi-Fi por Bluetooth (`/provision.html`): `firmware/esp32cam-helmet/README.md`.
