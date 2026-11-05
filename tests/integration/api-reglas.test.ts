import { beforeAll, describe, expect, it } from "vitest";

/**
 * Reglas de negocio de la API (backlog de la auditoría): domicilio solo para vehículos aptos,
 * tope de entregas por domiciliario, causa obligatoria al marcar tardía, cierre atómico de la
 * entrega, alertas que no se borran solas y timeout de la pasarela.
 */
process.env["UMH_DB_PATH"] = ":memory:";

const { getDb } = await import("../../src/server/db");
const { repos } = await import("../../src/server/repositories");
const { uid } = await import("../../src/server/db/seed");
const { handle, MAX_ACTIVE_DELIVERIES } = await import("../../src/server/api/handlers");
const { applyTelemetry } = await import("../../src/server/services/fleet-sim");
const { withTimeout } = await import("../../src/server/services/pasarela");

const BASE = "http://localhost";

async function login(email: string): Promise<string> {
  const res = await handle(
    new Request(`${BASE}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "Demo1234!" }),
    }),
  );
  expect(res.status).toBe(200);
  return (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

function call(cookie: string, method: string, path: string, body?: unknown) {
  return handle(
    new Request(`${BASE}${path}`, {
      method,
      headers: { cookie },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

function nuevoVehiculo(deliverable: boolean): string {
  const id = uid("TV");
  repos.vehicles.save({
    id,
    kind: "scooter",
    model: "Prueba",
    mode: "rent",
    rate_per_min_cop: 500,
    spec: "test",
    deliverable,
  });
  return id;
}

function reservaDomicilio(): string {
  const id = uid("RES");
  repos.reservations.create({
    id,
    user_id: "USRA-CLIENTE1",
    vehicle_id: nuevoVehiculo(true),
    modality: "delivery",
    address: "Cra 27 #36-10",
    status: "requested",
    requested_at: Date.now(),
  });
  return id;
}

let cliente = "";
let operador = "";
let domi = "";

beforeAll(async () => {
  getDb();
  cliente = await login("cliente@demo.co");
  operador = await login("operador@demo.co");
  domi = await login("domi1@demo.co");
});

describe("RF-05: reserva a domicilio", () => {
  it("rechaza domicilio para un vehículo que no es apto", async () => {
    const res = await call(cliente, "POST", "/api/reservations", {
      vehicleId: nuevoVehiculo(false),
      modality: "delivery",
      address: "Calle 1",
    });
    expect(res.status).toBe(422);
  });

  it("acepta domicilio para un vehículo apto", async () => {
    const res = await call(cliente, "POST", "/api/reservations", {
      vehicleId: nuevoVehiculo(true),
      modality: "delivery",
      address: "Calle 1",
    });
    expect(res.status).toBe(201);
  });
});

describe("UC14-E2: tope de entregas por domiciliario", () => {
  it(`la entrega número ${MAX_ACTIVE_DELIVERIES + 1} se rechaza con 422`, async () => {
    const courierId = "USRE-DOMI2";
    const abiertas = repos.deliveries.list({
      courierId,
      status: ["assigned", "in_progress", "late"],
    }).length;
    for (let i = abiertas; i < MAX_ACTIVE_DELIVERIES; i++) {
      const res = await call(operador, "POST", "/api/deliveries", {
        reservationId: reservaDomicilio(),
        courierId,
      });
      expect(res.status).toBe(201);
    }
    const extra = await call(operador, "POST", "/api/deliveries", {
      reservationId: reservaDomicilio(),
      courierId,
    });
    expect(extra.status).toBe(422);
  });
});

describe("UC16/UC17: realizar entrega y marcarla tardía", () => {
  async function asignada(): Promise<{ deliveryId: string; reservationId: string }> {
    const reservationId = reservaDomicilio();
    const res = await call(operador, "POST", "/api/deliveries", {
      reservationId,
      courierId: "USRD-DOMI1",
    });
    expect(res.status).toBe(201);
    const { delivery } = (await res.json()) as { delivery: { id: string } };
    return { deliveryId: delivery.id, reservationId };
  }

  it("marcar tardía sin causa → 422; dos veces → 409", async () => {
    const { deliveryId } = await asignada();
    const sinCausa = await call(domi, "PATCH", `/api/deliveries/${deliveryId}`, { action: "late" });
    expect(sinCausa.status).toBe(422);
    const ok = await call(domi, "PATCH", `/api/deliveries/${deliveryId}`, {
      action: "late",
      reason: "tráfico",
    });
    expect(ok.status).toBe(200);
    const otraVez = await call(domi, "PATCH", `/api/deliveries/${deliveryId}`, {
      action: "late",
      reason: "tráfico",
    });
    expect(otraVez.status).toBe(409);
  });

  it("al entregar: entrega entregada, reserva activa y vehículo en uso (estado coherente)", async () => {
    const { deliveryId, reservationId } = await asignada();
    await call(domi, "PATCH", `/api/deliveries/${deliveryId}`, { action: "start" });
    const res = await call(domi, "PATCH", `/api/deliveries/${deliveryId}`, { action: "deliver" });
    expect(res.status).toBe(200);
    const r = repos.reservations.byId(reservationId)!;
    expect(repos.deliveries.byId(deliveryId)?.status).toBe("delivered");
    expect(r.status).toBe("active");
    expect(repos.vehicles.byId(r.vehicle_id as string)?.status).toBe("in_use");
  });
});

describe("R2: las alertas no se borran solas", () => {
  it("una lectura sana no limpia una alerta activa; solo el operador la limpia", async () => {
    const id = nuevoVehiculo(false);
    const base = {
      vehicleId: id,
      ts: Date.now(),
      lat: 7.1,
      lng: -73.1,
      battery: 80,
      speedKmh: 10,
      helmetOn: true,
      impactG: 1,
      gpsFixAgeMs: 0,
      tripActive: false,
    };
    applyTelemetry({ ...base, impactG: 6 }, "simulator");
    expect(repos.vehicles.byId(id)?.alert_state).toBe("crash");
    applyTelemetry(base, "telemetry");
    expect(repos.vehicles.byId(id)?.alert_state).toBe("crash");
    const res = await call(operador, "POST", `/api/admin/alerts/${id}/clear`);
    expect(res.status).toBe(200);
    expect(repos.vehicles.byId(id)?.alert_state).toBe("ok");
  });
});

describe("UC18-E2: timeout de la pasarela", () => {
  it("si la pasarela no responde, el pago queda rechazado con reason='timeout'", async () => {
    const lenta = withTimeout({ name: "muda", charge: () => new Promise(() => undefined) }, 30);
    const r = await lenta.charge({ amountCop: 1000, method: "card" });
    expect(r).toEqual({ status: "rejected", reason: "timeout" });
  });
});
