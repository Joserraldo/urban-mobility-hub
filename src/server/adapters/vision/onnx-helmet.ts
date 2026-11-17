/**
 * Detector de cascos con ONNX Runtime (CPU) + sharp para decodificar/redimensionar.
 * Rendimiento: una sola sesión por proceso, tensor de entrada reutilizado, letterbox hecho por sharp
 * (libvips, SIMD) y preprocesado a CHW float32 en un solo bucle. La sesión se calienta al cargar.
 */
import { readFile } from "node:fs/promises";
import type * as Ort from "onnxruntime-node";
import { decideHelmet, decodeYolo, nms, type LabelConfig } from "../../domain/helmet-vision";
import type { HelmetDetector, HelmetVerdict } from "../../ports/vision";

type Sharp = typeof import("sharp").default;

export class OnnxHelmetDetector implements HelmetDetector {
  readonly ready = true;
  private readonly input: Float32Array;

  private constructor(
    private readonly ort: typeof Ort,
    private readonly session: Ort.InferenceSession,
    private readonly sharp: Sharp,
    private readonly cfg: LabelConfig,
  ) {
    this.input = new Float32Array(3 * cfg.input * (cfg.inputH ?? cfg.input));
  }

  static async load(
    modelPath: string,
    labelsPath: string,
    threads = 2,
  ): Promise<OnnxHelmetDetector> {
    const [ort, sharpMod, labels] = await Promise.all([
      import("onnxruntime-node"),
      import("sharp"),
      readFile(labelsPath, "utf8").then((t) => JSON.parse(t) as LabelConfig),
    ]);
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all",
      intraOpNumThreads: threads,
      interOpNumThreads: 1,
      // VISION_LOW_MEM=1: menos memoria (sin arena/patrones) a cambio de algo de velocidad; para VMs pequeñas.
      ...(process.env["VISION_LOW_MEM"] === "1"
        ? { enableCpuMemArena: false, enableMemPattern: false }
        : {}),
    });
    const det = new OnnxHelmetDetector(ort, session, sharpMod.default, labels);
    // Calentamiento: la primera petición real no paga la inicialización de libvips ni de ONNX Runtime.
    const blank = await det
      .sharp({
        create: {
          width: labels.input,
          height: labels.inputH ?? labels.input,
          channels: 3,
          background: "#808080",
        },
      })
      .jpeg()
      .toBuffer();
    await det.detect(blank);
    return det;
  }

  private async run(chw: Float32Array): Promise<Ort.Tensor> {
    const w = this.cfg.input;
    const h = this.cfg.inputH ?? w;
    const inputName = this.session.inputNames[0] as string;
    const res = await this.session.run({
      [inputName]: new this.ort.Tensor("float32", chw, [1, 3, h, w]),
    });
    return res[this.session.outputNames[0] as string] as Ort.Tensor;
  }

  async detect(jpeg: Uint8Array): Promise<HelmetVerdict> {
    const t0 = performance.now();
    const w = this.cfg.input;
    const h = this.cfg.inputH ?? w;
    // JPEG → RGB crudo ya dentro del lienzo WxH con bandas grises (letterbox), todo en libvips.
    const { data } = await this.sharp(jpeg, { failOn: "none" })
      .resize(w, h, { fit: "contain", kernel: "linear", background: { r: 114, g: 114, b: 114 } })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // HWC uint8 → CHW float32 [0,1]
    const plane = w * h;
    const chw = this.input;
    for (let i = 0, p = 0; i < plane; i++, p += 3) {
      chw[i] = (data[p] as number) / 255;
      chw[plane + i] = (data[p + 1] as number) / 255;
      chw[2 * plane + i] = (data[p + 2] as number) / 255;
    }
    const out = await this.run(chw);
    const raw = decodeYolo(
      out.data as Float32Array,
      out.dims,
      this.cfg.classes.length,
      this.cfg.scoreThreshold ?? 0.35,
    );
    const dets = nms(raw, this.cfg.iouThreshold ?? 0.5);
    return { ...decideHelmet(dets, this.cfg), inferenceMs: Math.round(performance.now() - t0) };
  }
}
