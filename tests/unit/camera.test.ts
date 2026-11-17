import { afterEach, describe, expect, it, vi } from "vitest";
import { cameraRequired, cameraVerdict } from "@/server/services/camera";

const mockFetch = (impl: () => Promise<Response>) => vi.stubGlobal("fetch", vi.fn(impl));
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("cameraVerdict (cámara ESP32-CAM del vehículo)", () => {
  it("devuelve el veredicto cuando hay fotograma reciente", async () => {
    mockFetch(() => json({ fresh: true, helmetDetected: true, confidence: 0.91, ageMs: 400 }));
    expect(await cameraVerdict("SC-1042")).toEqual({
      helmetDetected: true,
      confidence: 0.91,
      ageMs: 400,
    });
  });

  it("null si el último fotograma es viejo o no hay cámara", async () => {
    mockFetch(() => json({ fresh: false }));
    expect(await cameraVerdict("SC-1042")).toBeNull();
  });

  it("null si el servicio de visión no responde (el flujo cae en el navegador)", async () => {
    mockFetch(() => Promise.reject(new Error("ECONNREFUSED")));
    expect(await cameraVerdict("SC-1042")).toBeNull();
    mockFetch(() => json({ error: "x" }, 500));
    expect(await cameraVerdict("SC-1042")).toBeNull();
  });

  it("codifica el id del vehículo en la URL", async () => {
    const f = vi.fn(() => json({ fresh: false }));
    vi.stubGlobal("fetch", f);
    await cameraVerdict("A B/1");
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain("vehicleId=A%20B%2F1");
  });

  it("UMH_REQUIRE_CAMERA=1 exige la cámara", () => {
    expect(cameraRequired()).toBe(false);
    vi.stubEnv("UMH_REQUIRE_CAMERA", "1");
    expect(cameraRequired()).toBe(true);
  });
});
