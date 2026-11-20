# Lanzamiento: guía para el día de la demo

Documento principal para presentar el proyecto corriendo el servidor en la laptop. Detalle técnico en
[`DEMO-LOCAL.md`](DEMO-LOCAL.md), [`RECORRIDO-DEMO.md`](RECORRIDO-DEMO.md), [`FLUJOS-CLIENTE.md`](FLUJOS-CLIENTE.md),
[`MANTENIMIENTO.md`](MANTENIMIENTO.md) e [`INTEGRACIONES.md`](INTEGRACIONES.md).

Todos los comandos son para **Git Bash**, desde la raíz del repo (rutas con `/`).

## 1. Checklist de la noche antes

- [ ] Laptop cargada y cargador en la mochila; desactivar suspensión (Configuración > Energía > "Nunca" con corriente).
- [ ] Node 24 instalado (`node -v` debe dar v24.x; la API usa `node:sqlite`).
- [ ] Dependencias: `npm install`
- [ ] Modelo ONNX presente: `ls -l models/helmet.onnx models/helmet.labels.json`
- [ ] Visión compilada: `ls -l vision-service/dist/server.mjs` (si falta, `demo-local.sh` lo compila solo; ver 2.1).
- [ ] `cloudflared` instalado: `cloudflared --version` (ruta actual: `C:/Program Files (x86)/cloudflared/`). Sin él solo funciona en la laptop.
- [ ] Variables de entorno (solo nombres; los valores viven en tus archivos, nunca en git):
  - `.env.bold` (lo carga `demo-local.sh`): `BOLD_IDENTITY_KEY`, `BOLD_SECRET_KEY`, `BOLD_ENV=test` (llaves de **pruebas**, del mismo ambiente). Sin ellas se usa la pasarela simulada (el flujo igual funciona).
  - `.env.api`: `VITE_DATA_SOURCE`, `VITE_SSR_API_BASE`, `BOLD_*`, `BREVO_API_KEY`, `BREVO_SENDER`, `BREVO_FORCE_TO` (correo).
  - `INGEST_KEY` (>= 16 caracteres): el script la genera por sesión si no la defines. Si usas la ESP32-CAM debe ser la misma que en su `secrets.h`; fíjala: `export INGEST_KEY=<tu_clave>`.
  - `UMH_PUBLIC_URL`: la pone el script (URL del túnel).
- [ ] Brevo: la IP pública actual de la laptop debe estar en <https://app.brevo.com/security/authorised_ips> (si no, `401 unrecognised IP address`; la reserva no se rompe, el correo queda `failed`). Cambia con cada red: reautorízala en el lugar de la presentación o asume correo no enviado.
- [ ] Probar la webcam: abre la app (sección 3) y activa **Cámara PC**; permitir permiso de cámara en el navegador. Cerrar Zoom/Teams que la ocupen.
- [ ] Probar el celular (túnel o misma red, sección 5) y que tenga datos/Wi-Fi.
- [ ] Imprimir o tener abierta la hoja de QR: `docs/qr/index.html` (respaldo estático).
- [ ] Ensayo completo del guion (sección 4) al menos una vez.
- [ ] Verificación de hoy: `npm run typecheck` y `npm test` (ver sección 9).
- [ ] Pestañas listas: producción <https://urbanmobility.duckdns.org> como plan B.

## 2. Arranque paso a paso

Antes: cierra todo lo previo y libera puertos.

```
powershell -File scripts/demo-stop.ps1
```

```
cd "d:/José Tellez/Documents/universidad/sexto semestre/micro-motion-grid"
```

```
export INGEST_KEY=<tu_clave_de_16_o_mas_caracteres>
```

(opcional, solo si usarás la ESP32-CAM; si no, sáltate esa línea)

```
sh scripts/demo-local.sh
```

El script: genera/usa `INGEST_KEY`, abre el túnel `cloudflared` y espera la URL (hasta 30 s), compila visión si falta, arranca visión en
`127.0.0.1:8090` y la API+web en `:8080` con `UMH_SEED_DEMO=1` (vehículos de alquiler en vivo). Deja la terminal abierta.
Imprime un recuadro con `URL`, `Webhook Bold` y `Webcam PC`: **anota la URL `https://….trycloudflare.com`** (cambia en cada arranque).

### 2.1 Compilar visión a mano (si hace falta)

```
npx esbuild vision-service/server.ts --bundle --platform=node --format=esm --external:onnxruntime-node --external:sharp --outfile=vision-service/dist/server.mjs
```

Nota: `vision-service/README.md` menciona además `--external:bufferutil --external:utf-8-validate` y un banner `createRequire` para el
bundle de la VM; `demo-local.sh` usa el comando de arriba y `vision-service/dist/server.mjs` ya existe, así que para la demo no se toca.

### 2.2 Datos extra (opcional)

Más vehículos sin tocar lo existente: `node scripts/add-vehicles.mjs` (con el servidor parado o no; escribe en `data/umh.db`).
Regenerar los QR estáticos: `npx tsx scripts/generate-qr.ts --out=docs/qr`

## 3. Cómo verificar que está arriba

En otra terminal Git Bash:

```
curl -s http://localhost:8080/api/health
```

Debe responder JSON con la BD (`sqlite`, `data/umh.db`). Luego:

| Qué         | Dónde                                             | Debe verse                                                                                              |
| ----------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Landing     | `http://localhost:8080/`                          | página principal                                                                                        |
| App cliente | `http://localhost:8080/app`                       | mapa con hubs y vehículos; 3 violetas "En alquiler"                                                     |
| Operador    | `http://localhost:8080/admin`                     | KPIs, flota en vivo moviéndose, pestañas Monitoreo/Mantenimiento/Catálogo/Entregas/Cámara PC/Hoja de QR |
| Hoja de QR  | `http://localhost:8080/admin/qr`                  | tarjetas con QR `UMH:<id>`                                                                              |
| Visión      | `curl -s http://127.0.0.1:8090/api/camera/latest` | responde (sin fotogramas aún es normal)                                                                 |
| Túnel       | la URL `trycloudflare.com` impresa                | misma app, con HTTPS                                                                                    |

Prueba rápida: entra como `operador@demo.co`, abre **Cámara PC**, activa la webcam y comprueba "Con casco / Sin casco" con fps.

## 4. Cuentas demo y guion (5 a 8 min)

Contraseña de todas: `Demo1234!`

| Rol                            | Correo                                            |
| ------------------------------ | ------------------------------------------------- |
| Operador                       | `operador@demo.co`                                |
| Cliente                        | `cliente@demo.co` (también `cliente2..5@demo.co`) |
| Viajero (3 alquileres en vivo) | `viajero@demo.co`                                 |
| Domiciliarios                  | `domi1@demo.co`, `domi2@demo.co`, `domi3@demo.co` |

Vehículos libres para reservar: `SC-1171`, `SC-1210` (HUB-01); `SC-1180`, `SC-1181` (HUB-02); `SC-1191`, `SC-1212` (HUB-03); `SC-1200`, `SC-1213` (HUB-04).
No uses los reservados (`SC-1150`, `SC-1172`, `SC-1190`, `SC-1211`, `SC-1042`, `SC-1088`) ni los violetas en vivo (`SC-1201`, `SC-1202`, `BK-2203`).

Disposición recomendada: PC con dos ventanas (operador a la izquierda, hoja de QR a la derecha) y el celular como cliente.

**Parte A, cliente (3 min), en el celular (URL del túnel) con `cliente@demo.co`**

1. `/app`: mapa y catálogo; muestra los violetas "En alquiler" con batería y velocidad.
2. Elige `SC-1171` > **Reservar** (modalidad hub). Llega el correo de confirmación (Brevo) si la IP está autorizada.
3. **Pagar prepago** de $ 10.000 con Bold sandbox (tarjeta de prueba de Bold). Al volver a `/pago/resultado` y luego a **Mis reservas** debe decir "Lista para desbloquear".
4. **Desbloquear**: escanea con el celular el QR de `SC-1171` desde `/admin/qr` en el PC (o escribe `UMH:SC-1171`).
5. **Casco**: en el PC, `/admin` > **Cámara PC**, elige `SC-1171` y activa la webcam. Sin casco: el servidor niega; con casco puesto: aprueba (decide el veredicto del servidor).
6. Rostro y **iniciar viaje**; aparece en Mis reservas; luego **Finalizar** y cobro por minuto.

**Parte B, operador (2 min), en el PC con `operador@demo.co`**

1. **Monitoreo**: KPIs, mapa de flota en vivo (violeta alquiler, gris con anillo naranja mantenimiento); toca un vehículo: gemelo digital con velocidad y gráfica de telemetría.
2. Alertas: usa el simulador (caída / batería crítica) y muestra la bitácora y la alerta en el mapa.
3. **Mantenimiento**: envía un vehículo libre a mantenimiento (desaparece del catálogo del cliente), ciérralo (vuelve a `available`).
4. **Cámara PC**: muestra el veredicto con/sin casco en vivo.
5. **Hoja de QR**: imprimir / "Cómo llegar".

**Parte C, domiciliario (1 min)**: entra como `domi1@demo.co`, muestra sus entregas asignadas y el cambio de estado.

Cierre sugerido (30 s): arquitectura (React + API Node/SQLite + visión ONNX + ESP32-CAM) y producción en la VM.

## 5. Acceso desde el celular y ESP32-CAM

**Túnel (recomendado)**: abre en el celular la URL `https://….trycloudflare.com` que imprimió el script. HTTPS, así que la cámara funciona. Vite acepta `*.trycloudflare.com` y `*.ngrok-free.app` (`vite.config.ts`). La URL cambia en cada arranque.

**Misma red, sin túnel**: IP de la laptop (hoy `192.168.1.11`; compruébala con `ipconfig | grep IPv4`) y abre `http://<IP>:8080`. El servidor escucha en `::`, pero el firewall de Windows puede bloquear el 8080 en redes públicas. Limitación: sin HTTPS el navegador del celular **no** da acceso a la cámara (solo `localhost` o HTTPS), y hosts distintos de localhost pueden ser rechazados por Vite; para la demo usa el túnel.

**ESP32-CAM** (firmware en `firmware/esp32cam-helmet/`):

- Con la misma red Wi-Fi 2,4 GHz que la laptop. Copia `include/secrets.example.h` a `include/secrets.h` y ajusta `SERVER_HOST` (IP de la laptop), `SERVER_PORT`, `USE_TLS`, `INGEST_KEY` (idéntica a la del servidor) y `DEVICE_ID` (id del vehículo, p. ej. `SC-1171`); luego compila y carga con PlatformIO. O configúrala por Bluetooth desde `/provision.html` (Chrome Android, HTTPS: usa el túnel o producción).
- Atención: `demo-local.sh` deja visión en `127.0.0.1:8090` y la ESP32 enviaría a `SERVER_PORT` de la API; **no hay en este repo un reenvío probado de la placa hacia la visión local**. Riesgo alto: la webcam del PC (Cámara PC) es el camino verificado para mañana; trata la ESP32-CAM como extra y apunta a producción (`urbanmobility.duckdns.org`, HTTPS) si quieres mostrarla.

## 6. Plan B

- **Producción**: <https://urbanmobility.duckdns.org> (VM, Nginx + Let's Encrypt, mismas cuentas demo). Verifica antes: `curl -s https://urbanmobility.duckdns.org/api/health`. Guía: `deploy/README.md`.
- **Sin internet**: la app local sigue funcionando en `http://localhost:8080` (pasarela simulada si Bold no responde; Brevo queda `failed` sin romper nada; visión local no necesita red). Sin túnel no hay celular: usa la laptop sola o comparte la red de datos del celular y úsala como hotspot (el túnel vuelve).
- **Bold falla**: quita las llaves (no cargues `.env.bold`, o arranca sin `BOLD_IDENTITY_KEY`) para usar la pasarela simulada, que aprueba al instante. Monto `999999` se rechaza siempre (útil para mostrar el rechazo).
- **Brevo falla**: no bloquea; menciona que el correo se registra `failed`/`simulated`. Revisa IP autorizada.
- **Visión falla / cámara 503**: el desbloqueo cae al veredicto del cliente (simulación en la UI) salvo que `UMH_REQUIRE_CAMERA=1`. Para la demo no lo actives.
- **Laptop cae del todo**: producción en la VM + diapositivas (`documentos/`, `entregables/`).

## 7. Solución de problemas

| Síntoma                                                    | Qué hacer                                                                                                                                                                                                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Puerto 8080/8090 ocupado (`EADDRINUSE`)                    | `powershell -File scripts/demo-stop.ps1` y volver a arrancar                                                                                                                                                                                         |
| Cámara PC responde 503                                     | Falta `INGEST_KEY` (>= 16 caracteres) en el entorno del servidor o visión no responde. Cierra, `export INGEST_KEY=…` y relanza con `sh scripts/demo-local.sh` (el script la exporta a visión y API; si arrancaste la API por separado, no la heredó) |
| Registrar rostro: `422 Falta el consentimiento biométrico` | Las cuentas demo no tienen consentimiento `biometria` (`entregables/PENDIENTES.md` 2.1). Regístrate con una cuenta nueva marcando la casilla biométrica, o usa el modo demo/simulado del paso de rostro. Pruébalo en el ensayo                       |
| Rostro "aprobado" sin cámara                               | Es el modo demo (`VITE_DEMO_TOOLS`, PENDIENTES 2.3); no lo presentes como biometría real                                                                                                                                                             |
| 402 al desbloquear                                         | Falta el prepago aprobado: paga primero en Mis reservas                                                                                                                                                                                              |
| Vehículo no aparece                                        | Está `reserved`, `in_use` o en mantenimiento; elige otro de la lista de libres                                                                                                                                                                       |
| Túnel sin URL ("No salió la URL del túnel")                | Sin internet o `cloudflared` bloqueado; sigue en `localhost:8080` o relanza                                                                                                                                                                          |
| Webcam no abre en el celular                               | Usa la URL HTTPS del túnel, no la IP                                                                                                                                                                                                                 |
| Correo `401 unrecognised IP address`                       | Autoriza la IP en Brevo (sección 1)                                                                                                                                                                                                                  |
| BD rara tras pruebas                                       | Con servidor parado, copia de seguridad y borrado: `cp data/umh.db data/umh.db.bak` y `rm data/umh.db`; el seed la recrea al arrancar                                                                                                                |
| Visión no arranca (falta onnxruntime/sharp)                | `npm install`; confirma `models/helmet.onnx`; benchmark sin servidor: `npx tsx scripts/bench-helmet.ts src/assets/domiciliario.jpg`                                                                                                                  |

## 8. Cierre: apagar todo

1. En la terminal del script: `Ctrl+C` (cierra visión y túnel).
2. Si quedó algo: `powershell -File scripts/demo-stop.ps1` (túnel, 8080 y 8090).
3. Comprueba: `curl -s -m 2 http://localhost:8080/api/health || echo apagado`
4. Si hiciste cambios de datos que no quieres conservar: restaura `data/umh.db` desde tu copia.

## 9. Estado de verificación (20-nov-2026)

Ejecutado hoy en esta laptop, sobre el árbol de trabajo actual (con cambios sin commit):

| Comprobación                                                 | Comando                              | Resultado                                                                 |
| ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------- |
| Typecheck                                                    | `npm run typecheck` (`tsc --noEmit`) | **OK, 0 errores**                                                         |
| Unit + integración                                           | `npm test` (`vitest run`)            | **20 archivos, 156/156 pruebas pasaron, 0 fallaron**                      |
| E2E (Playwright)                                             | `npm run test:e2e`                   | **no ejecutado** (requiere una instancia aparte; ver `FLUJOS-CLIENTE.md`) |
| Servidor real (arranque, Bold sandbox, webcam, túnel, ESP32) | n/a                                  | **no probado hoy**; ensayar antes (sección 1)                             |

Sin fallos que anotar. Riesgos conocidos: ver `entregables/PENDIENTES.md` (biometría demo, consentimiento 422) y la nota de ESP32 de la sección 5.
