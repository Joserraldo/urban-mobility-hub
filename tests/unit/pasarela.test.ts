import { describe, expect, it } from "vitest";

import { simulatedGateway } from "../../src/server/services/pasarela";

/** UC18 / RF-26: la pasarela simulada es determinista para que los e2e no dependan del azar. */
describe("pasarela simulada (UC18)", () => {
  it("aprueba montos normales con referencia PAY-...", async () => {
    const r = await simulatedGateway.charge({ amountCop: 10_000, method: "card" });
    expect(r.status).toBe("approved");
    expect(r.reference).toMatch(/^PAY-[0-9A-F]{8}$/);
  });

  it("rechaza SIEMPRE el monto de prueba 999999 (rama E1 sin azar)", async () => {
    const r = await simulatedGateway.charge({ amountCop: 999_999, method: "card" });
    expect(r.status).toBe("rejected");
    expect(r.reason).toContain("fondos insuficientes");
    expect(r.reference).toBeUndefined();
  });

  it("rechaza efectivo sobre $5.000.000 COP", async () => {
    const r = await simulatedGateway.charge({ amountCop: 5_000_001, method: "cash" });
    expect(r.status).toBe("rejected");
  });

  it("permite efectivo hasta $5.000.000 (pago en hub)", async () => {
    const r = await simulatedGateway.charge({ amountCop: 5_000_000, method: "cash" });
    expect(r.status).toBe("approved");
  });

  it("dos cobros aprobados no comparten referencia (idempotencia por referencia única)", async () => {
    const a = await simulatedGateway.charge({ amountCop: 1000, method: "card" });
    const b = await simulatedGateway.charge({ amountCop: 1000, method: "card" });
    expect(a.reference).not.toBe(b.reference);
  });
});
