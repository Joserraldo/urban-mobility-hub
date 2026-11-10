# Firmware ESP32-CAM — cámara de casco

La placa **solo captura y envía JPEG**. El backend (`POST /api/camera/frame`) ejecuta el modelo de cascos
(`models/`) y decide; el desbloqueo usa ese veredicto con `POST /api/unlock/sessions/:id/helmet/camera`.

## Transporte en tiempo real (WebSocket)

Canal principal: `wss://<servidor>/api/camera/ws` (cabeceras `x-ingest-key` y `x-device-id`). La placa manda cada
JPEG como mensaje binario **sin esperar respuesta**; el servidor empuja por el mismo canal `{"h","c","n"}` (casco,
confianza, intervalo) cuando termina de analizar, y cambia `n` al instante cuando alguien empieza a desbloquear.
Si el WebSocket no conecta en 15 s, cae solo al `POST /api/camera/frame` de abajo.

- Núcleo 0: captura y comprime el siguiente fotograma; núcleo 1: transmite el anterior (en paralelo).
- Sensor sin JPEG por hardware: `CAM_SOFT_FRAME_SIZE` (por defecto HVGA 480×320, ~3 fps al desbloquear). Con
  `FRAMESIZE_QVGA` sube a ~6-8 fps pero el modelo ve menos detalle. `CAM_SOFT_JPEG_QUALITY` (0-100).

## Cómo envía por HTTP (respaldo)

| Decisión                                       | Efecto                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Conexión TCP keep-alive única                  | sin handshake por fotograma                                                                        |
| Cuerpo = JPEG crudo (no base64/multipart)      | −33 % de bytes y cero conversión                                                                   |
| JPEG por hardware del sensor, VGA calidad 12   | 25-35 KB/fotograma, 0 % de CPU de compresión                                                       |
| 2 buffers en PSRAM + `GRAB_LATEST`             | captura y envío solapados; siempre se manda el fotograma más reciente                              |
| Buffer devuelto antes de leer la respuesta     | el driver captura mientras se espera el ack                                                        |
| Respuesta `{"ok":1,"h":0\|1,"c":0-100,"n":ms}` | `n` = intervalo pedido por el servidor: 200 ms con un desbloqueo esperando el casco, 2 s en reposo |
| Wi-Fi sin ahorro de energía, TX máx.           | latencia baja y estable                                                                            |
| Vigilante                                      | reconecta a los 30 s sin ack y reinicia a los 120 s                                                |

El LED rojo de la placa (GPIO33) se enciende cuando el último veredicto fue «casco puesto».

## Configurar el Wi-Fi desde el celular (Bluetooth)

Sin Wi-Fi guardado (o si no logra conectar en 20 s) la placa NO inicia la cámara: entra en **modo Bluetooth** y se
anuncia como `NODO-CAM-XXXX`. Desde el celular:

1. Abre **`/provision.html`** de la app (p. ej. `https://TU-DOMINIO/provision.html`) en **Chrome para Android**.
   Web Bluetooth exige HTTPS (o `localhost`); con `http://IP:8080` no funciona salvo que habilites esa dirección en
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2. **Buscar cámara por Bluetooth** → elige `NODO-CAM-XXXX`.
3. Escribe SSID y contraseña (red de **2,4 GHz**). En «Servidor (opcional)» puedes fijar IP/puerto del backend, id del
   vehículo, clave `INGEST_KEY` y HTTPS (si lo dejas vacío, se usa lo de `secrets.h`).
4. **Enviar a la cámara**. La placa prueba la conexión, avisa el resultado, lo guarda en su memoria y reinicia sola.

Alternativa sin la página (iPhone o sin HTTPS): app **nRF Connect**. Servicio `6e0d0001-b5a3-f393-e0a9-e50e24dcca9e`,
característica de escritura `…0002…` con texto `ssid=Mi%20Red⏎pass=clave⏎⏎` (valores codificados en %XX, línea vacía al final);
`…0003…` notifica `ready`, `connecting`, `ok:<ip>`, `ok-noserver:<ip>`, `fail:wifi`, `fail:data`.

Cambiar de red más adelante: si la red guardada falla, a los 60 s la placa reinicia y vuelve al modo Bluetooth. También
se puede forzar escribiendo `wifi-reset` en el monitor serie. Si nadie configura nada en 5 min reintenta con lo guardado.

> Seguridad: mientras está en modo Bluetooth, cualquiera cerca puede configurarla; el modo solo está activo sin
> conexión Wi-Fi y las credenciales viajan sin cifrar por BLE. Configúrala en un sitio de confianza.

## Valores por defecto de compilación

```
copy include\secrets.example.h include\secrets.h     # servidor, INGEST_KEY, DEVICE_ID (y opcionalmente WIFI_*)
```

- `SERVER_HOST`: IP LAN del PC con el backend (`ipconfig`). `npm run dev` ya escucha en `8080` en todas las interfaces;
  permite ese puerto en el Firewall de Windows (red privada).
- `INGEST_KEY`: igual que la variable de entorno del backend (`dev-ingest-key` en desarrollo).
- `DEVICE_ID`: id de un vehículo existente (p. ej. `SC-1042`).
- `USE_TLS 1` para HTTPS (en producción; con HTTP la clave viaja en claro).

## Compilar y subir (PlatformIO)

```
cd firmware\esp32cam-helmet
python -m platformio run                      # compilar
python -m platformio run -t upload            # subir (placa con base USB MB: entra sola en modo flash)
python -m platformio device monitor           # ver estadísticas cada 5 s
```

Si la base no resetea sola: mantén pulsado **IO0→GND** (botón BOOT de la base) al iniciar la subida y pulsa RESET.

Salida esperada del monitor:

```
[wifi] conectado 192.168.1.77  RSSI -52 dBm
[stat] 2.5 fps  80 kB/s  rtt 380 ms  err 0  casco=1 (93%)
```
