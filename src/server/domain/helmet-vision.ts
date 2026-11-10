/**
 * Lógica PURA de visión (sin ONNX ni sharp): decodificación de la salida de YOLO, NMS y la decisión
 * final de "casco puesto". Testeable sin modelo (tests/unit/helmet-vision.test.ts).
 */
export interface LabelConfig {
  /** ancho de entrada del modelo (px) */
  input: number;
  /** alto de entrada (px); por defecto igual a `input`. Un modelo exportado a 640x480 evita relleno con VGA. */
  inputH?: number;
  /** nombres de clase en el orden del modelo */
  classes: string[];
  /** clases que cuentan como "casco puesto" */
  positive: string[];
  /** clases que cuentan como "sin casco" (cabeza descubierta) */
  negative: string[];
  /** umbral mínimo de score para considerar una detección (por defecto 0.35) */
  scoreThreshold?: number;
  /** IoU para NMS (por defecto 0.5) */
  iouThreshold?: number;
}

export interface Detection {
  cls: number;
  score: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Decodifica la salida cruda. Soporta:
 *  - YOLOv8/11 clásico:  dims [1, 4+nc, N]  (cx, cy, w, h, scores…) → requiere NMS
 *  - YOLO end-to-end:    dims [1, N, 6]     (x1, y1, x2, y2, score, clase) → ya sin NMS
 * Las cajas quedan en píxeles del tensor de entrada; el veredicto no necesita deshacer el letterbox.
 */
export function decodeYolo(
  data: Float32Array,
  dims: readonly number[],
  nc: number,
  scoreThr: number,
): Detection[] {
  const out: Detection[] = [];
  if (dims.length !== 3) throw new Error(`Salida de modelo inesperada: dims=${dims.join("x")}`);
  const a = dims[1] as number;
  const b = dims[2] as number;
  if (a === 4 + nc) {
    // [4+nc, N]: cada fila es un canal; cada columna, una ancla
    const n = b;
    for (let i = 0; i < n; i++) {
      let best = -1;
      let bestScore = scoreThr;
      for (let c = 0; c < nc; c++) {
        const s = data[(4 + c) * n + i] as number;
        if (s > bestScore) {
          bestScore = s;
          best = c;
        }
      }
      if (best < 0) continue;
      const cx = data[i] as number;
      const cy = data[n + i] as number;
      const w = data[2 * n + i] as number;
      const h = data[3 * n + i] as number;
      out.push({
        cls: best,
        score: bestScore,
        x1: cx - w / 2,
        y1: cy - h / 2,
        x2: cx + w / 2,
        y2: cy + h / 2,
      });
    }
    return out;
  }
  if (b === 6) {
    for (let i = 0; i < a; i++) {
      const o = i * 6;
      const score = data[o + 4] as number;
      if (score < scoreThr) continue;
      out.push({
        cls: Math.round(data[o + 5] as number),
        score,
        x1: data[o] as number,
        y1: data[o + 1] as number,
        x2: data[o + 2] as number,
        y2: data[o + 3] as number,
      });
    }
    return out;
  }
  throw new Error(`Salida de modelo no reconocida (dims=${dims.join("x")}, clases=${nc})`);
}

const iou = (p: Detection, q: Detection) => {
  const iw = Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1);
  const ih = Math.min(p.y2, q.y2) - Math.max(p.y1, q.y1);
  if (iw <= 0 || ih <= 0) return 0;
  const inter = iw * ih;
  return inter / ((p.x2 - p.x1) * (p.y2 - p.y1) + (q.x2 - q.x1) * (q.y2 - q.y1) - inter);
};

/** NMS por clase (voraz). */
export function nms(dets: Detection[], iouThr: number): Detection[] {
  const sorted = [...dets].sort((p, q) => q.score - p.score);
  const kept: Detection[] = [];
  for (const d of sorted)
    if (kept.every((k) => k.cls !== d.cls || iou(k, d) < iouThr)) kept.push(d);
  return kept;
}

/**
 * Decisión sobre el SUJETO PRINCIPAL: entre las detecciones de casco / sin casco gana la de mayor
 * `score × área` (la persona más cercana a la cámara, que es quien se desbloquea). Así otra persona al
 * fondo no puede tapar ni falsear el resultado. Sin detecciones → no hay casco: falla de forma segura.
 */
export function decideHelmet(
  dets: Detection[],
  cfg: Pick<LabelConfig, "classes" | "positive" | "negative">,
) {
  const idx = (names: string[]) =>
    new Set(names.map((n) => cfg.classes.indexOf(n)).filter((i) => i >= 0));
  const pos = idx(cfg.positive);
  const neg = idx(cfg.negative);
  let best: Detection | undefined;
  let bestW = 0;
  for (const d of dets) {
    if (!pos.has(d.cls) && !neg.has(d.cls)) continue;
    const w = d.score * Math.max(1e-6, (d.x2 - d.x1) * (d.y2 - d.y1));
    if (w > bestW) {
      bestW = w;
      best = d;
    }
  }
  if (!best) return { helmetDetected: false, confidence: 0 };
  return { helmetDetected: pos.has(best.cls), confidence: best.score };
}
