import { describe, expect, it } from "vitest";

import { playSound, setMuted } from "../../src/lib/sound";

/** Los sonidos nunca deben romper la app: sin Web Audio (servidor, pruebas) no hacen nada. */
describe("sonidos de la interfaz", () => {
  it("playSound no falla cuando no hay Web Audio disponible", () => {
    for (const s of ["tap", "toggle", "locate", "step", "success", "error", "alert"] as const) {
      expect(() => playSound(s)).not.toThrow();
    }
  });

  it("silenciar y reactivar no falla sin localStorage", () => {
    expect(() => setMuted(true)).not.toThrow();
    expect(() => playSound("success")).not.toThrow();
    expect(() => setMuted(false)).not.toThrow();
  });
});
