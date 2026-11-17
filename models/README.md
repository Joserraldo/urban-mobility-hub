# Modelo de detección de cascos (backend)

**Modelo incluido (no versionado, ~100 MB):** `JarvanLee/yolov8-helmet-violation-detection` (Hugging Face, licencia Apache-2.0),
YOLOv8m con clases `helmet`, `head` (cabeza sin casco) y `person`. Se descargó `weights/best.pt` y se exportó a ONNX a
640×480 (el tamaño del fotograma VGA de la cámara, sin relleno):

```
python -c "from ultralytics import YOLO; YOLO('best.pt').export(format='onnx', imgsz=[480,640], simplify=True, opset=17)"
# copiar el .onnx a models/helmet.onnx
```

Medido en este PC (CPU, 4 hilos): ~350 ms por fotograma por la API completa (~2,8 fps máx.). Probar sin cámara:
`npx tsx scripts/bench-helmet.ts foto.jpg`. Si necesitas más velocidad, entrena/exporta una variante `n` o `s`.

El backend carga al arrancar `models/helmet.onnx` + `models/helmet.labels.json` (rutas cambiables con
`HELMET_MODEL_PATH` / `HELMET_LABELS_PATH`). Sin ellos la API sigue funcionando y `POST /api/camera/frame`
responde `503 VISION_UNAVAILABLE`.

## Formato aceptado

Cualquier detector YOLO exportado a ONNX (Ultralytics `yolo export format=onnx imgsz=640 simplify=True`):

- Salida clásica `[1, 4+nc, N]` (YOLOv8/YOLO11) → se aplica NMS en el servidor.
- Salida end-to-end `[1, N, 6]` (YOLOv10/YOLO26) → se usa tal cual.

`helmet.labels.json` dice cómo interpretar las clases del modelo:

```json
{
  "input": 640,
  "classes": ["helmet", "no-helmet"],
  "positive": ["helmet"],
  "negative": ["no-helmet"],
  "scoreThreshold": 0.35,
  "iouThreshold": 0.5
}
```

- `classes`: nombres EN EL MISMO ORDEN que el modelo (`model.names` de Ultralytics).
- `positive` / `negative`: qué clases cuentan como casco puesto y como cabeza descubierta.
- Regla de decisión: hay casco solo si la mejor detección positiva supera a la mejor negativa; sin detecciones → no hay casco.
  Luego el desbloqueo exige confianza ≥ 0.8 (`HELMET_MIN_CONFIDENCE`).

## Rendimiento

Un modelo nano/small (`yolov8n`, `yolo11n`) a 640 px tarda ~30-80 ms por fotograma en CPU de portátil. Variables útiles:
`VISION_THREADS` (hilos de ONNX Runtime, 2 por defecto) y `CAMERA_FRESH_MS` (antigüedad máxima del fotograma
usado para desbloquear, 5000 por defecto).

## Modelo en la VM (2026-11-17)

La VM usa el YOLOv8n de `public/models/helmet.onnx` (el del navegador, 2 clases `With Helmet` / `Without Helmet`, 640×640)
**convertido de float16 a float32**, porque `onnxruntime-node` en el servidor alimenta tensores float32 y con el fp16 original
falla con `Unexpected input data type`. Conversión: cambiar initializers, nodos `Cast` y tipos de entrada/salida de FLOAT16 a FLOAT
(librería `onnx`). Etiquetas en la VM (`/opt/umh-vision/models/helmet.labels.json`):
`{"input":640,"classes":["With Helmet","Without Helmet"],"positive":["With Helmet"],"negative":["Without Helmet"]}`.
Para pasar al YOLOv8m de 3 clases descrito arriba, reemplazar ambos archivos y reiniciar `umh-vision`.
