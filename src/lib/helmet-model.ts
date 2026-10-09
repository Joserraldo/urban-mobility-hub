/**
 * Detección de casco con YOLOv8n (ONNX fp16) en el navegador vía onnxruntime-web.
 * Modelo: iam-tsr/yolov8n-helmet-detection (MIT) → best.onnx convertido a fp16.
 * Sustituye el punto de integración `detectHelmet` de camera.ts (RD7): si el modelo
 * no carga o no hay cámara, el llamador cae en simulación (la demo nunca se rompe).
 */
import * as ort from "onnxruntime-web";

export const HELMET_MODEL_URL = "/models/helmet.onnx";
export const HELMET_INPUT_SIZE = 640;
export const HELMET_MIN_MODEL_CONF = 0.4;

/** Clases en orden del head del detector. */
export const HELMET_CLASSES = ["With Helmet", "Without Helmet"] as const;
export const HELMET_CLASS_WITH = 0;

export type HelmetDetection = {
  helmetDetected: boolean;
  confidence: number;
  box?: { x: number; y: number; w: number; h: number }; // en coordenadas del input (640px)
};

type ModelState = "idle" | "loading" | "ready" | "error";
let state: ModelState = "idle";
let sessionPromise: Promise<ort.InferenceSession> | null = null;

export function helmetModelState(): ModelState {
  return state;
}

/** Empieza la descarga del modelo una sola vez (se llama al entrar al paso casco). */
export function preloadHelmetModel(): Promise<void> {
  if (sessionPromise) return sessionPromise.then(() => undefined);
  state = "loading";
  ort.env.wasm.wasmPaths = "/ort/"; // runtime local en public/ort (sin CDN, funciona offline)
  if (typeof self === "undefined" || !self.crossOriginIsolated) ort.env.wasm.numThreads = 1;
  sessionPromise = ort.InferenceSession.create(HELMET_MODEL_URL, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "basic",
  })
    .then((s) => {
      state = "ready";
      return s;
    })
    .catch((e) => {
      state = "error";
      throw e;
    });
  return sessionPromise.then(() => undefined).catch(() => undefined);
}

async function getSession(): Promise<ort.InferenceSession> {
  if (sessionPromise) return sessionPromise;
  await preloadHelmetModel();
  return sessionPromise!;
}

/** Toma el frame actual del <video>, hace letterbox a 640 y devuelve el tensor fp16 NCHW. */
function videoToTensor(video: HTMLVideoElement, size = HELMET_INPUT_SIZE): ort.Tensor {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.fillStyle = "#727272"; // relleno de padding (114/255≈0.447 en gris 0-1 es lo que usa YOLO)
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / video.videoWidth, size / video.videoHeight);
  const dw = Math.round(video.videoWidth * scale);
  const dh = Math.round(video.videoHeight * scale);
  ctx.drawImage(video, (size - dw) / 2, (size - dh) / 2, dw, dh);

  const { data } = ctx.getImageData(0, 0, size, size);
  const f32 = new Float32Array(3 * size * size);
  const inv = 1 / 255;
  for (let i = 0; i < size * size; i++) {
    const j = i * 4;
    f32[i] = data[j]! * inv;
    f32[size * size + i] = data[j + 1]! * inv;
    f32[2 * size * size + i] = data[j + 2]! * inv;
  }
  return new ort.Tensor("float16", f32ToF16Buffer(f32), [1, 3, size, size]);
}

/** Inferencia completa: tensor → ONNX → postproceso → veredicto de casco. */
export async function runHelmetModel(video: HTMLVideoElement): Promise<HelmetDetection> {
  const session = await getSession();
  const feeds: Record<string, ort.Tensor> = {
    [session.inputNames[0] as string]: videoToTensor(video),
  };
  const output = await session.run(feeds);
  const tensor = output[session.outputNames[0] as string];
  return yolov8Postprocess(
    tensor?.data as Float32Array,
    [...(tensor?.dims ?? [])],
    HELMET_INPUT_SIZE,
  );
}

/**
 * Postproceso YOLOv8 puro: `raw` es el tensor [1, 4+NC, N] (aquí [1, 6, 8400]),
 * cada ancla es [cx, cy, w, h, scores...]. Devuelve el veredicto de casco.
 */
export function yolov8Postprocess(
  raw: ArrayLike<number>,
  dims: number[],
  size: number,
  confThreshold = HELMET_MIN_MODEL_CONF,
  iouThreshold = 0.45,
): HelmetDetection {
  const N = dims[2] ?? 8400;
  const C = dims[1] ?? 6;
  const classes = C - 4;
  const dets: { x1: number; y1: number; x2: number; y2: number; conf: number; cls: number }[] = [];

  for (let i = 0; i < N; i++) {
    const cx = Number(raw[i]);
    const cy = Number(raw[N + i]);
    const w = Number(raw[2 * N + i]);
    const h = Number(raw[3 * N + i]);
    let cls = 0;
    let conf = -Infinity;
    for (let c = 0; c < classes; c++) {
      const sc = Number(raw[(4 + c) * N + i]);
      if (sc > conf) {
        conf = sc;
        cls = c;
      }
    }
    if (conf < confThreshold) continue;
    dets.push({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, conf, cls });
  }

  if (dets.length === 0) return { helmetDetected: false, confidence: 0 };

  const kept = nms(dets, iouThreshold);
  const top = kept[0] ?? dets[0]!;
  return {
    helmetDetected: top.cls === HELMET_CLASS_WITH,
    confidence: top.conf,
    box: { x: top.x1, y: top.y1, w: top.x2 - top.x1, h: top.y2 - top.y1 },
  };
}

/** Non-Maximum Suppression por IoU sobre detecciones ya filtradas por confianza. */
export function nms(
  dets: { x1: number; y1: number; x2: number; y2: number; conf: number; cls: number }[],
  iouThreshold: number,
): typeof dets {
  const order = dets
    .map((d, i) => ({ i, conf: d.conf }))
    .sort((a, b) => b.conf - a.conf)
    .map((o) => o.i);
  const kept: typeof dets = [];
  const removed = new Set<number>();
  for (const i of order) {
    if (removed.has(i)) continue;
    const di = dets[i]!;
    kept.push(di);
    for (const j of order) {
      if (removed.has(j) || j === i) continue;
      const dj = dets[j]!;
      const ix = Math.max(0, Math.min(di.x2, dj.x2) - Math.max(di.x1, dj.x1));
      const iy = Math.max(0, Math.min(di.y2, dj.y2) - Math.max(di.y1, dj.y1));
      const inter = ix * iy;
      const union = (di.x2 - di.x1) * (di.y2 - di.y1) + (dj.x2 - dj.x1) * (dj.y2 - dj.y1) - inter;
      if (inter / (union || 1e-9) > iouThreshold) removed.add(j);
    }
  }
  return kept;
}

/** float32 → float16 (bits IEEE 754, little-endian): onnxruntime-web pide Uint16Array. */
export function f32ToF16(v: number): number {
  const f = new Float32Array(1);
  f[0] = v;
  const bits = new Uint32Array(f.buffer)[0] ?? 0;
  const sign = (bits >>> 16) & 0x8000;
  const exp = (bits >>> 23) & 0xff;
  let mant = bits & 0x7fffff;
  if (exp === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0); // NaN/Inf
  let e = exp - 127 + 15;
  if (e <= 0) return sign; // subnormal/tan pequeño → 0
  if (e >= 31) return sign | 0x7c00; // desbordamiento → Inf
  mant = (mant + 0x1000) >> 13; // redondeo al más cercano
  if (mant >= 0x400) {
    mant = 0;
    e += 1;
  }
  return sign | (e << 10) | mant;
}

export function f32ToF16Buffer(f32: Float32Array): Uint16Array {
  const out = new Uint16Array(f32.length);
  for (let i = 0; i < f32.length; i++) out[i] = f32ToF16(f32[i] ?? 0);
  return out;
}
