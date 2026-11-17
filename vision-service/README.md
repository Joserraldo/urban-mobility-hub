# umh-vision (servicio de cámara en la VM)

Sidecar que recibe los JPEG del ESP32-CAM, corre el modelo de cascos y guarda el último veredicto por vehículo.
No modifica la app de producción: solo lee su SQLite en modo lectura.

| Pieza       | Dónde                                                                                                                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código      | `vision-service/server.ts` → `npx esbuild vision-service/server.ts --bundle --platform=node --format=esm --external:onnxruntime-node --external:sharp --outfile=vision-service/dist/server.mjs` (+ banner `createRequire`) |
| VM          | `/opt/umh-vision/` (server.mjs, models/, node_modules con onnxruntime-node y sharp para Linux)                                                                                                                             |
| Servicio    | `umh-vision.service` (usuario `umh`, MemoryMax 560M), entorno en `/etc/umh/vision.env` (INGEST_KEY)                                                                                                                        |
| nginx       | `location /api/camera/` → `127.0.0.1:8090`; `location = /provision.html` (Web Bluetooth)                                                                                                                                   |
| Integración | la app, al verificar el casco de un desbloqueo, consulta `GET 127.0.0.1:8090/api/camera/latest`; si hay fotograma ≤5 s manda el veredicto de la cámara, si no, el del cliente (parche en `_ssr/handlers-*.mjs`)            |

Respaldos previos al despliegue: `/opt/umh-backup-<fecha>/` (output, datos, nginx, env).

Revertir el parche: copiar `output/server/_ssr/handlers-*.mjs` del respaldo a `/opt/umh/.output/server/_ssr/` y `systemctl restart umh`.

## WebSocket de la cámara

`wss://<servidor>/api/camera/ws` (nginx `location = /api/camera/ws` con Upgrade; cabeceras `x-ingest-key` y `x-device-id`).
Mensaje binario = JPEG; el servidor responde texto `{"h","c","n"}` al terminar cada análisis y cuando cambia el ritmo
(60 ms durante un desbloqueo, 1500 ms en reposo). El `POST /api/camera/frame` sigue disponible como respaldo.
El bundle se compila con `--external:bufferutil --external:utf-8-validate` además de onnxruntime-node y sharp.
