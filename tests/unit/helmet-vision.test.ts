import { describe, expect, it } from "vitest";
import { decideHelmet, decodeYolo, nms, type Detection } from "@/server/domain/helmet-vision";

const CLASSES = ["helmet", "no-helmet"];
const cfg = { classes: CLASSES, positive: ["helmet"], negative: ["no-helmet"] };

/** Construye un tensor estilo YOLOv8 [1, 4+nc, N] con las anclas dadas. */
function v8(anchors: { box: [number, number, number, number]; scores: number[] }[]): {
  data: Float32Array;
  dims: number[];
} {
  const n = anchors.length;
  const data = new Float32Array((4 + CLASSES.length) * n);
  anchors.forEach((a, i) => {
    a.box.forEach((v, k) => (data[k * n + i] = v));
    a.scores.forEach((s, c) => (data[(4 + c) * n + i] = s));
  });
  return { data, dims: [1, 4 + CLASSES.length, n] };
}

describe("decodeYolo", () => {
  it("YOLOv8: convierte cx,cy,w,h a esquinas y filtra por umbral", () => {
    const { data, dims } = v8([
      { box: [100, 100, 40, 60], scores: [0.9, 0.1] },
      { box: [300, 300, 40, 40], scores: [0.2, 0.3] }, // por debajo del umbral
    ]);
    const d = decodeYolo(data, dims, 2, 0.35);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ cls: 0, x1: 80, y1: 70, x2: 120, y2: 130 });
    expect(d[0]?.score).toBeCloseTo(0.9);
  });

  it("end-to-end [1,N,6]: lee x1,y1,x2,y2,score,clase", () => {
    const data = new Float32Array([10, 10, 50, 50, 0.8, 1, 0, 0, 0, 0, 0.1, 0]);
    const d = decodeYolo(data, [1, 2, 6], 2, 0.35);
    expect(d).toEqual([{ cls: 1, score: expect.closeTo(0.8, 5), x1: 10, y1: 10, x2: 50, y2: 50 }]);
  });

  it("rechaza formas de salida desconocidas", () => {
    expect(() => decodeYolo(new Float32Array(10), [1, 7, 9], 2, 0.3)).toThrow(/no reconocida/);
    expect(() => decodeYolo(new Float32Array(10), [10], 2, 0.3)).toThrow(/inesperada/);
  });
});

describe("nms", () => {
  const box = (cls: number, score: number, x1: number): Detection => ({
    cls,
    score,
    x1,
    y1: 0,
    x2: x1 + 100,
    y2: 100,
  });
  it("elimina solapadas de la misma clase y conserva la de mayor score", () => {
    const k = nms([box(0, 0.6, 5), box(0, 0.9, 0), box(0, 0.5, 400)], 0.5);
    expect(k.map((d) => d.score)).toEqual([0.9, 0.5]);
  });
  it("no mezcla clases distintas", () => {
    expect(nms([box(0, 0.9, 0), box(1, 0.8, 0)], 0.5)).toHaveLength(2);
  });
});

describe("decideHelmet", () => {
  const det = (cls: number, score: number): Detection => ({
    cls,
    score,
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
  });
  it("casco si gana a sin-casco", () =>
    expect(decideHelmet([det(0, 0.9), det(1, 0.4)], cfg)).toEqual({
      helmetDetected: true,
      confidence: 0.9,
    }));
  it("sin casco si sin-casco gana", () =>
    expect(decideHelmet([det(0, 0.5), det(1, 0.7)], cfg)).toEqual({
      helmetDetected: false,
      confidence: 0.7,
    }));
  it("sin detecciones falla de forma segura", () =>
    expect(decideHelmet([], cfg)).toEqual({ helmetDetected: false, confidence: 0 }));
  it("ignora nombres de clase que el modelo no tiene", () => {
    expect(
      decideHelmet([det(0, 0.9)], {
        classes: CLASSES,
        positive: ["casco"],
        negative: ["no-helmet"],
      }),
    ).toEqual({ helmetDetected: false, confidence: 0 });
  });

  it("decide por el sujeto principal (mayor score × área), no por una persona lejana", () => {
    const big = (cls: number, score: number): Detection => ({
      cls,
      score,
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 200,
    });
    const far = (cls: number, score: number): Detection => ({
      cls,
      score,
      x1: 0,
      y1: 0,
      x2: 20,
      y2: 20,
    });
    // cerca: sin casco (0.7); al fondo alguien CON casco muy seguro (0.95) => el usuario no lleva casco
    expect(decideHelmet([big(1, 0.7), far(0, 0.95)], cfg)).toEqual({
      helmetDetected: false,
      confidence: 0.7,
    });
    // cerca: con casco; al fondo alguien sin casco => aprobado
    expect(decideHelmet([big(0, 0.8), far(1, 0.9)], cfg)).toEqual({
      helmetDetected: true,
      confidence: 0.8,
    });
  });
});
