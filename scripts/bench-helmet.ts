/**
 * Prueba rápida del modelo de cascos sin cámara ni servidor:
 *   npx tsx scripts/bench-helmet.ts ruta/foto.jpg [repeticiones]
 * Imprime el veredicto y la latencia (primera inferencia y media del resto).
 */
import { readFileSync } from "node:fs";
import { OnnxHelmetDetector } from "../src/server/adapters/vision/onnx-helmet";

const [file, reps = "10"] = process.argv.slice(2);
if (!file) {
  console.error("Uso: npx tsx scripts/bench-helmet.ts foto.jpg [repeticiones]");
  process.exit(1);
}
const cfg = {
  helmetModelPath: process.env["HELMET_MODEL_PATH"] ?? "models/helmet.onnx",
  helmetLabelsPath: process.env["HELMET_LABELS_PATH"] ?? "models/helmet.labels.json",
  visionThreads: Number(process.env["VISION_THREADS"] ?? 4),
};
const t0 = performance.now();
const det = await OnnxHelmetDetector.load(
  cfg.helmetModelPath,
  cfg.helmetLabelsPath,
  cfg.visionThreads,
);
console.log(`modelo cargado en ${Math.round(performance.now() - t0)} ms`);
const jpeg = new Uint8Array(readFileSync(file));
const first = await det.detect(jpeg);
console.log("veredicto:", first);
const times: number[] = [];
for (let i = 0; i < Number(reps); i++) times.push((await det.detect(jpeg)).inferenceMs);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log(
  `latencia media (${times.length} corridas): ${avg.toFixed(0)} ms  ->  ~${(1000 / avg).toFixed(1)} fps máx.`,
);
