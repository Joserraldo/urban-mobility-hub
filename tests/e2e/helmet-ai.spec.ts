import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * RD7 / RF-09: verificación real del modelo de casco (YOLOv8n-ONNX) en el navegador.
 * Carga el modelo desde /models/helmet.onnx con el runtime WASM local (/ort/) y corre
 * una inferencia completa sobre una foto de muestra con `canvas.captureStream()`.
 */
const fixture = path.join(process.cwd(), "tests", "fixtures", "helmet-muestra.jpg");
const helmetJpg = fs.readFileSync(fixture).toString("base64");

async function runInference(
  page: import("@playwright/test").Page,
  imageB64: string,
): Promise<{ state: string; helmet: boolean; confidence: number; error?: string }> {
  return page.evaluate(async (b64) => {
    const m = await import("/src/lib/helmet-model.ts");
    await m.preloadHelmetModel();
    const state = m.helmetModelState();

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("sin canvas 2d");
    const img = new Image();
    img.src = "data:image/jpeg;base64," + b64;
    await img.decode();
    ctx.drawImage(img, 0, 0, 640, 480);
    const stream = canvas.captureStream(30);
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => setTimeout(r, 300));
    try {
      const r = await m.runHelmetModel(video);
      stream.getTracks().forEach((t) => t.stop());
      return { state, helmet: r.helmetDetected, confidence: r.confidence };
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      return { state, helmet: false, confidence: 0, error: String(e) };
    }
  }, imageB64);
}

test("IA de casco: el modelo ONNX carga en el navegador y detecta un casco en la foto de muestra", async ({
  page,
}) => {
  test.setTimeout(90_000); // descarga WASM+modelo e inferencia pueden tardar bajo carga
  await page.goto("/");
  const r = await runInference(page, helmetJpg);
  expect(r.error).toBeUndefined();
  expect(r.state).toBe("ready");
  expect(r.helmet).toBe(true);
  expect(r.confidence).toBeGreaterThan(0.5);
});
