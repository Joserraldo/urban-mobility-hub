// RF-08 / RNF-01 · riesgo RD6 (latencia). R-20 del SRS: se mide renderedAt - generatedAt.
import { describe, expect, it } from "vitest";
import { isPositionFresh } from "@/server/domain/tracking";

describe("frescura de la posición (TC-TRK-01..03)", () => {
  it("TC-TRK-01 2 s de retraso => cumple", () => {
    expect(isPositionFresh(10_000, 12_000)).toBe(true);
  });
  it("TC-TRK-02 exactamente 5 s => cumple (límite)", () => {
    expect(isPositionFresh(10_000, 15_000)).toBe(true);
  });
  it("TC-TRK-03 5.001 s => NO cumple", () => {
    expect(isPositionFresh(10_000, 15_001)).toBe(false);
  });
});
