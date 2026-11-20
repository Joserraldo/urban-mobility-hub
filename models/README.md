# Modelo de detección de cascos (backend)

**Modelo actual (`models/helmet.onnx`, 12 MB, fp32):** YOLOv8n de 2 clases `{0: "With Helmet", 1: "Without Helmet"}` a 640×640, el mismo del
navegador (`public/models/helmet.onnx`, fp16) pero convertido a float32, porque `onnxruntime-node` alimenta tensores float32 y con fp16 falla
(`Unexpected input data type`). Conversión: cambiar initializers, nodos `Cast` y tipos de entrada/salida de FLOAT16 a FLOAT (librería `onnx`).
`models/helmet.labels.json` debe coincidir con esas 2 clases:

```json
{
  "input": 640,
  "classes": ["With Helmet", "Without Helmet"],
  "positive": ["With Helmet"],
  "negative": ["Without Helmet"],
  "scoreThreshold": 0.35,
  "iouThreshold": 0.5
}
```

(Antes decía 3 clases helmet/head/person a 480: no correspondía al modelo, el decodificador fallaba y la cámara quedaba "offline".
`models/helmet-yolov8n.labels.json`, sin versionar, es una copia de ese error y ya no se usa.)

Medido en este PC (CPU, 4 hilos): ~56 ms por fotograma (~18 fps máx.). Probar sin cámara:
`npx tsx scripts/bench-helmet.ts foto.jpg`.

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
  "classes": ["With Helmet", "Without Helmet"],
  "positive": ["With Helmet"],
  "negative": ["Without Helmet"],
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
