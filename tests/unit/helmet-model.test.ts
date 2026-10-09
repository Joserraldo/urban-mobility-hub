import { describe, expect, it } from "vitest";

import { f32ToF16, nms, yolov8Postprocess } from "@/lib/helmet-model";

/** Crea un tensor [1,6,N] plano, todo en ceros salvo el ancla dada. */
function tensorWithAnchor(
  anchor: { cx: number; cy: number; w: number; h: number; scores: [number, number] },
  N = 8400,
): { raw: Float32Array; dims: number[] } {
  const raw = new Float32Array(6 * N);
  const i = 100;
  raw[i] = anchor.cx;
  raw[N + i] = anchor.cy;
  raw[2 * N + i] = anchor.w;
  raw[3 * N + i] = anchor.h;
  raw[4 * N + i] = anchor.scores[0];
  raw[5 * N + i] = anchor.scores[1];
  return { raw, dims: [1, 6, N] };
}

describe("yolov8Postprocess (RD7)", () => {
  it("detecta casco puesto (clase With Helmet) con confianza alta", () => {
    const { raw, dims } = tensorWithAnchor({ cx: 300, cy: 200, w: 80, h: 80, scores: [0.9, 0.1] });
    const r = yolov8Postprocess(raw, dims, 640);
    expect(r.helmetDetected).toBe(true);
    expect(r.confidence).toBeCloseTo(0.9, 1);
    expect(r.box).toBeDefined();
  });

  it("detecta rostro sin casco (clase Without Helmet) y niega", () => {
    const { raw, dims } = tensorWithAnchor({ cx: 300, cy: 200, w: 80, h: 80, scores: [0.2, 0.95] });
    const r = yolov8Postprocess(raw, dims, 640);
    expect(r.helmetDetected).toBe(false);
    expect(r.confidence).toBeCloseTo(0.95, 1);
  });

  it("sin detecciones devuelve false con confianza 0", () => {
    const { raw, dims } = tensorWithAnchor({ cx: 0, cy: 0, w: 0, h: 0, scores: [0.01, 0.01] });
    const r = yolov8Postprocess(raw, dims, 640, 0.4);
    expect(r.helmetDetected).toBe(false);
    expect(r.confidence).toBe(0);
  });

  it("NMS elimina cajas redundantes y conserva la de mayor confianza", () => {
    const dets = [
      { x1: 0, y1: 0, x2: 100, y2: 100, conf: 0.5, cls: 1 },
      { x1: 10, y1: 10, x2: 110, y2: 110, conf: 0.9, cls: 1 },
      { x1: 300, y1: 300, x2: 320, y2: 320, conf: 0.7, cls: 1 },
    ];
    const kept = nms(dets, 0.45);
    expect(kept.map((d) => d.conf)).toEqual([0.9, 0.7]);
  });
});

describe("f32ToF16", () => {
  it("convierte valores típicos de píxel (0–1) sin romperse", () => {
    for (const v of [0, 0.447, 1, -1, 0.5]) {
      expect(typeof f32ToF16(v)).toBe("number");
      expect(Number.isFinite(f32ToF16(v))).toBe(true);
    }
  });

  it("1.0 → 0x3C00", () => {
    expect(f32ToF16(1)).toBe(0x3c00);
  });
});
