// RF-05, RF-03, R-17/R-18 del SRS · riesgo RD13
import { describe, expect, it } from "vitest";
import { InvalidTransitionError, rentalCost, transition } from "@/server/domain/reservations";

type Status = "requested" | "active" | "completed" | "cancelled";
type Ev = "start" | "finish" | "cancel";
const mk = (status: Status) => ({ id: "R-1", status });

describe("transiciones permitidas (TC-RES-01..04)", () => {
  it("TC-RES-01 requested --start--> active", () => {
    expect(transition(mk("requested"), "start").status).toBe("active");
  });
  it("TC-RES-02 requested --cancel--> cancelled", () => {
    expect(transition(mk("requested"), "cancel").status).toBe("cancelled");
  });
  it("TC-RES-03 active --finish--> completed", () => {
    expect(transition(mk("active"), "finish").status).toBe("completed");
  });
  it("TC-RES-04 active --cancel--> cancelled", () => {
    expect(transition(mk("active"), "cancel").status).toBe("cancelled");
  });
});

describe("transiciones prohibidas (TC-RES-05..08)", () => {
  const forbidden: [Status, Ev][] = [
    ["requested", "finish"],
    ["active", "start"],
    ["completed", "start"],
    ["completed", "finish"],
    ["completed", "cancel"],
    ["cancelled", "start"],
    ["cancelled", "finish"],
    ["cancelled", "cancel"],
  ];
  it.each(forbidden)("TC-RES-05 %s + %s => InvalidTransitionError", (from, ev) => {
    expect(() => transition(mk(from), ev)).toThrow(InvalidTransitionError);
  });
  it("TC-RES-06 transition no muta el objeto original", () => {
    const r = mk("requested");
    transition(r, "start");
    expect(r.status).toBe("requested");
  });
});

describe("costo del alquiler (TC-RES-09..11)", () => {
  it("TC-RES-09 10 min x $450 = $4.500", () => {
    expect(rentalCost(10, 450)).toBe(4500);
  });
  it("TC-RES-10 redondea minutos hacia arriba: 10.2 min x $450 = 11 min", () => {
    expect(rentalCost(10.2, 450)).toBe(4950);
  });
  it("TC-RES-11 minutos <= 0 lanza error", () => {
    expect(() => rentalCost(0, 450)).toThrow();
    expect(() => rentalCost(-3, 450)).toThrow();
  });
});
