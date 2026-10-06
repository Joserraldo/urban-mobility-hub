// RF-11, RF-12, RF-15, RNF-02, RNF-04 · riesgo RD8 (fallo del trigger de seguridad)
// Cada uno de los 4 triggers se prueba: caso que SÍ dispara, valor límite, y caso que NO dispara.
import { describe, expect, it } from "vitest";
import { ALERT_THRESHOLDS, evaluateTelemetry } from "@/server/domain/alerts";

const base = {
  vehicleId: "SC-1042",
  ts: 1_000_000,
  lat: 4.65,
  lng: -74.05,
  battery: 80,
  speedKmh: 18,
  helmetOn: true,
  impactG: 0.2,
  gpsFixAgeMs: 500,
  tripActive: true,
};

describe("umbrales documentados (R-06 del SRS)", () => {
  it("expone los umbrales acordados", () => {
    expect(ALERT_THRESHOLDS).toMatchObject({ criticalBattery: 15, impactG: 3, gpsLostMs: 10000 });
  });
});

describe("estado normal", () => {
  it("TC-ALR-00 telemetría sana => ok", () => {
    expect(evaluateTelemetry(base)).toBe("ok");
  });
});

describe("trigger 1: batería crítica (TC-ALR-01..03)", () => {
  it("TC-ALR-01 batería 10% => low-battery", () => {
    expect(evaluateTelemetry({ ...base, battery: 10 })).toBe("low-battery");
  });
  it("TC-ALR-02 límite exacto 15% => low-battery", () => {
    expect(evaluateTelemetry({ ...base, battery: 15 })).toBe("low-battery");
  });
  it("TC-ALR-03 16% => ok (justo encima del límite)", () => {
    expect(evaluateTelemetry({ ...base, battery: 16 })).toBe("ok");
  });
});

describe("trigger 2: caída / impacto (TC-ALR-04..06)", () => {
  it("TC-ALR-04 impacto 5 g => crash", () => {
    expect(evaluateTelemetry({ ...base, impactG: 5 })).toBe("crash");
  });
  it("TC-ALR-05 límite exacto 3 g => crash", () => {
    expect(evaluateTelemetry({ ...base, impactG: 3 })).toBe("crash");
  });
  it("TC-ALR-06 2.9 g (bache) => ok", () => {
    expect(evaluateTelemetry({ ...base, impactG: 2.9 })).toBe("ok");
  });
});

describe("trigger 3: pérdida de GPS (TC-ALR-07..08)", () => {
  it("TC-ALR-07 sin fix durante 10 s => gps-lost", () => {
    expect(evaluateTelemetry({ ...base, gpsFixAgeMs: 10000 })).toBe("gps-lost");
  });
  it("TC-ALR-08 sin fix 9.9 s => ok", () => {
    expect(evaluateTelemetry({ ...base, gpsFixAgeMs: 9900 })).toBe("ok");
  });
});

describe("trigger 4: sin casco (TC-ALR-09..11)", () => {
  it("TC-ALR-09 viaje activo y casco no detectado => no-helmet", () => {
    expect(evaluateTelemetry({ ...base, helmetOn: false })).toBe("no-helmet");
  });
  it("TC-ALR-10 sin viaje activo (estacionado) => ok aunque no haya casco", () => {
    expect(evaluateTelemetry({ ...base, helmetOn: false, tripActive: false })).toBe("ok");
  });
  it("TC-ALR-11 con casco => ok", () => {
    expect(evaluateTelemetry({ ...base, helmetOn: true })).toBe("ok");
  });
});

describe("prioridad cuando hay varias condiciones (R-07 del SRS)", () => {
  it("TC-ALR-12 caída + sin casco + batería => crash", () => {
    expect(evaluateTelemetry({ ...base, impactG: 4, helmetOn: false, battery: 5 })).toBe("crash");
  });
  it("TC-ALR-13 sin casco + GPS => no-helmet", () => {
    expect(evaluateTelemetry({ ...base, helmetOn: false, gpsFixAgeMs: 20000 })).toBe("no-helmet");
  });
  it("TC-ALR-14 GPS + batería => gps-lost", () => {
    expect(evaluateTelemetry({ ...base, gpsFixAgeMs: 20000, battery: 5 })).toBe("gps-lost");
  });
});
