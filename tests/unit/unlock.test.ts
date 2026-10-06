// RF-09, RF-10 · riesgo RD7 (falsos positivos/negativos), RD8
import { describe, expect, it } from "vitest";
import {
  UnlockOrderError,
  canStartTrip,
  createUnlockSession,
  scanQr,
  verifyFace,
  verifyHelmet,
} from "@/server/domain/unlock";

const T0 = 1_000_000;
const TTL = 120_000;
const VID = "SC-1042";
const okHelmet = { helmetDetected: true, confidence: 0.95 };
const atHelmet = () => scanQr(createUnlockSession(VID, T0), `UMH:${VID}`, T0 + 1000);

describe("flujo feliz en 3 pasos (TC-UNL-01..03)", () => {
  it("TC-UNL-01 la sesión nace en el paso 'qr'", () => {
    expect(createUnlockSession(VID, T0).step).toBe("qr");
  });
  it("TC-UNL-02 QR válido avanza a 'helmet'", () => {
    expect(atHelmet().step).toBe("helmet");
  });
  it("TC-UNL-03 QR + casco ok => 'ready' y se puede iniciar viaje", () => {
    const s = verifyHelmet(atHelmet(), okHelmet, T0 + 2000);
    expect(s.step).toBe("ready");
    expect(canStartTrip(s, T0 + 3000)).toBe(true);
  });
});

describe("no se puede iniciar sin casco (TC-UNL-04..09) — corazón de RD8", () => {
  it("TC-UNL-04 antes de verificar, no se puede iniciar", () => {
    expect(canStartTrip(atHelmet(), T0 + 1500)).toBe(false);
  });
  it("TC-UNL-05 casco NO detectado => denied", () => {
    const s = verifyHelmet(atHelmet(), { helmetDetected: false, confidence: 0.99 }, T0 + 2000);
    expect(s.step).toBe("denied");
    expect(canStartTrip(s, T0 + 2500)).toBe(false);
  });
  it("TC-UNL-06 confianza 0.79 => denied (límite inferior)", () => {
    const s = verifyHelmet(atHelmet(), { helmetDetected: true, confidence: 0.79 }, T0 + 2000);
    expect(s.step).toBe("denied");
  });
  it("TC-UNL-07 confianza 0.80 => ready (límite exacto)", () => {
    const s = verifyHelmet(atHelmet(), { helmetDetected: true, confidence: 0.8 }, T0 + 2000);
    expect(s.step).toBe("ready");
  });
  it("TC-UNL-08 QR de otro vehículo => denied", () => {
    expect(scanQr(createUnlockSession(VID, T0), "UMH:OTRO-999", T0 + 1000).step).toBe("denied");
  });
  it("TC-UNL-09 QR basura => denied", () => {
    expect(scanQr(createUnlockSession(VID, T0), "hola", T0 + 1000).step).toBe("denied");
  });
});

describe("orden obligatorio de los pasos (TC-UNL-14, R-10 del SRS)", () => {
  it("verificar casco sin escanear QR lanza UnlockOrderError", () => {
    expect(() => verifyHelmet(createUnlockSession(VID, T0), okHelmet, T0 + 10)).toThrow(
      UnlockOrderError,
    );
  });
});

describe("caducidad de la sesión (TC-UNL-15..17)", () => {
  const ready = () => verifyHelmet(atHelmet(), okHelmet, T0 + 2000);
  it("TC-UNL-15 a los 120 s exactos aún es válida", () => {
    expect(canStartTrip(ready(), T0 + TTL)).toBe(true);
  });
  it("TC-UNL-16 pasados 120 s ya no se puede iniciar", () => {
    expect(canStartTrip(ready(), T0 + TTL + 1)).toBe(false);
  });
  it("TC-UNL-17 escanear QR tras caducar => expired", () => {
    expect(scanQr(createUnlockSession(VID, T0), `UMH:${VID}`, T0 + TTL + 1).step).toBe("expired");
  });
});

describe("reconocimiento facial como alterno al QR (TC-UNL-10..13, 18; RF-10, RD7)", () => {
  const user = { registered: true, consent: true };
  const face = (score: number, u = user) =>
    verifyFace(createUnlockSession(VID, T0), { score, ...u }, T0 + 1000);

  it("TC-UNL-10 similitud 0.86 con consentimiento => avanza a 'helmet'", () => {
    expect(face(0.86).step).toBe("helmet");
  });
  it("TC-UNL-11 similitud 0.85 (límite exacto) => avanza", () => {
    expect(face(0.85).step).toBe("helmet");
  });
  it("TC-UNL-12 similitud 0.84 => denied (evita falso positivo)", () => {
    expect(face(0.84).step).toBe("denied");
  });
  it("TC-UNL-13 sin consentimiento o no registrado => denied aunque score=1", () => {
    expect(face(1, { registered: true, consent: false }).step).toBe("denied");
    expect(face(1, { registered: false, consent: true }).step).toBe("denied");
  });
  it("TC-UNL-18 el rostro NO reemplaza el casco: tras el rostro no se puede iniciar", () => {
    expect(canStartTrip(face(0.99), T0 + 1500)).toBe(false);
  });
});
