# Despliegue en la VM (producción)

Estado actual: **desplegado y funcionando** en `https://urbanmobility.duckdns.org`
(IP `20.221.192.0` desde 2026-11-13, tras migrar de una VM anterior que murió; Ubuntu 24.04, Node 24, Nginx + Let's Encrypt, SQLite local).

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

| Variable             | Valor / uso                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | `production`                                                                                                                              |
| `PORT`               | `8080`                                                                                                                                    |
| `HOST`               | `127.0.0.1` (solo Nginx llega al app)                                                                                                     |
| `UMH_INTERNAL_URL`   | `http://127.0.0.1:8080` (fetch del SSR contra el API)                                                                                     |
| `UMH_DB_PATH`        | `/var/lib/umh/umh.db`                                                                                                                     |
| `UMH_SESSION_SECRET` | secreto aleatorio de 32 bytes (HMAC de sesión)                                                                                            |
| `UMH_DATA_KEY`       | secreto aleatorio de 32 bytes (datos sensibles)                                                                                           |
| `BREVO_API_KEY`      | opcional; sin ella el correo queda en `simulated`                                                                                         |
| `BREVO_SENDER`       | opcional; remitente verificado en Brevo                                                                                                   |
| `BOLD_IDENTITY_KEY`  | llave de identidad de Bold (pruebas); sin ella, pasarela simulada                                                                         |
| `BOLD_SECRET_KEY`    | llave secreta de Bold (la de PRUEBAS en sandbox); firma la orden del checkout embebido. Sin ella se usa el link de pago (redirige a Bold) |
| `BOLD_EMBEDDED`      | opcional; `0` fuerza el link de pago aunque haya llave secreta                                                                            |
| `BOLD_ENV`           | `test` (sandbox) o `production`                                                                                                           |
| `UMH_PUBLIC_URL`     | `https://urbanmobility.duckdns.org` (retorno del pago)                                                                                    |
| `UMH_SEED_DEMO`      | `1` carga el seeder de datos demo (ver `docs/SEEDER.md`); idempotente                                                                     |

## Pagos con Bold (llaves de prueba)

Sin `BOLD_IDENTITY_KEY` la app usa la pasarela simulada. Para activar Bold en la VM:

```bash
ssh -i new_vmingsoftiijose_key.pem azureuser@20.221.192.0
sudo nano /etc/umh/umh.env     # BOLD_IDENTITY_KEY, BOLD_SECRET_KEY (de pruebas), BOLD_ENV=test, UMH_PUBLIC_URL
sudo chown root:umh /etc/umh/umh.env && sudo chmod 640 /etc/umh/umh.env
sudo systemctl restart umh
```

Con `BOLD_SECRET_KEY` el pago se abre **dentro de la página** (checkout embebido del Botón de
pagos). Las dos llaves deben ser del mismo ambiente (ambas de pruebas o ambas de producción).
En pruebas Bold no envía webhooks solos: la app consulta el estado de la orden a la API de Bold.

En el panel de Bold (Integraciones) registra el webhook de pruebas:
`https://urbanmobility.duckdns.org/api/payments/bold/webhook`.

## Desplegar una versión nueva

Desde la raíz del repo, en local:

```bash
NITRO_PRESET=node_server VITE_SITE_URL=https://urbanmobility.duckdns.org \
  npx vite build --mode api

tar -czf /tmp/umh-release.tar.gz .output src/server/db/schema.sql
scp -i new_vmingsoftiijose_key.pem /tmp/umh-release.tar.gz \
  azureuser@20.221.192.0:/home/azureuser/
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

## Provisionar una VM desde cero (migración 2026-11-13)

Pasos usados para levantar la VM nueva (Ubuntu 24.04 limpia, 4 GB RAM):

1. **Azure NSG**: abrir TCP 22, 80 y 443 de entrada. Sin esto el dominio da _timeout_
   aunque el firewall de la VM esté libre (las reglas no migran con la VM).
2. **DuckDNS**: apuntar `urbanmobility.duckdns.org` a la IP nueva.
3. En la VM: swap de 2 GB (`/swapfile` en `fstab`), Node 24 (NodeSource), `nginx`,
   `certbot python3-certbot-nginx`, usuario de sistema `umh`, carpetas `/opt/umh`,
   `/var/lib/umh`, `/etc/umh`.
4. Subir el build (sección anterior), crear `/etc/umh/umh.env` (secretos aleatorios con
   `openssl rand -hex 32`), instalar `umh.service` y `systemctl enable --now umh`.
5. nginx: sitio HTTP que proxea a `127.0.0.1:8080`; luego
   `sudo certbot --nginx -d urbanmobility.duckdns.org --redirect` genera el TLS.
6. **Brevo**: autorizar la IP de la VM en <https://app.brevo.com/security/authorised_ips>
   (si no, la API responde 401 `unrecognised IP address`). Ver `docs/INTEGRACIONES.md`.

> `*.pem` está en `.gitignore`. Si pegaste llaves (Bold, Brevo) en un chat, rótalas.
