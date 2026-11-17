import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { decodeQr, normalizeQr } from "@/lib/qr";
import { scanQr, createUnlockSession } from "@/server/domain/unlock";
import { vehicleQrPayload, vehicleQrSvg } from "@/server/services/qr";

/** Rasteriza un QR a RGBA como lo vería la cámara (módulos negros sobre blanco, con margen). */
function render(text: string, scale = 6, margin = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const size = (n + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (!qr.modules.get(x, y)) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + margin) * scale + dy) * size + (x + margin) * scale + dx) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
    }
  return { data, size };
}

describe("QR del vehículo (UC08)", () => {
  it("el contenido es UMH:<id>", () => expect(vehicleQrPayload("SC-1042")).toBe("UMH:SC-1042"));

  it("el QR de SC-1042 se genera, se lee con jsQR y desbloquea el paso del casco", () => {
    const { data, size } = render(vehicleQrPayload("SC-1042"));
    const leido = decodeQr(data, size, size);
    expect(leido).toBe("UMH:SC-1042");
    const s = scanQr(createUnlockSession("SC-1042"), normalizeQr(leido as string), Date.now());
    expect(s.step).toBe("helmet");
  });

  it("el QR de OTRO vehículo se rechaza", () => {
    const { data, size } = render(vehicleQrPayload("SC-1088"));
    const s = scanQr(
      createUnlockSession("SC-1042"),
      decodeQr(data, size, size) as string,
      Date.now(),
    );
    expect(s.step).toBe("denied");
  });

  it("una imagen sin QR no devuelve nada", () => {
    expect(decodeQr(new Uint8ClampedArray(100 * 100 * 4).fill(200), 100, 100)).toBeNull();
  });

  it("el SVG imprimible es un SVG válido", async () => {
    expect(await vehicleQrSvg("UMH:SC-1042")).toMatch(/^<\?xml|^<svg/);
  });

  it("normalizeQr quita espacios y saltos de línea", () =>
    expect(normalizeQr(" UMH:SC-1042\n")).toBe("UMH:SC-1042"));
});
