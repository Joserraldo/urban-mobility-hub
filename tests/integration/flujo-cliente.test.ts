import { beforeAll, describe, expect, it } from "vitest";

/** Flujo del cliente con la pasarela SIMULADA (sin BOLD_*): prepago obligatorio y reservas sin pagar acotadas. */
process.env["UMH_DB_PATH"] = ":memory:";
delete process.env["BOLD_IDENTITY_KEY"];
delete process.env["BOLD_SECRET_KEY"];

const { getDb } = await import("../../src/server/db");
const { repos } = await import("../../src/server/repositories");
const { uid } = await import("../../src/server/db/seed");
const { handle } = await import("../../src/server/api/handlers");

const BASE = "http://localhost";
let cookie = "";

async function login(email: string): Promise<string> {
  const res = await handle(
    new Request(`${BASE}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "Demo1234!" }),
    }),
  );
  return (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}
const call = (method: string, path: string, body?: unknown) =>
  handle(
    new Request(`${BASE}${path}`, {
      method,
      headers: { cookie },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
const json = async <T>(res: Response) => (await res.json()) as T;

function rentable(): string {
  const id = uid("TV");
  repos.vehicles.save({
    id,
    kind: "scooter",
    model: "Flujo",
    mode: "rent",
    rate_per_min_cop: 500,
    spec: "t",
  });
  return id;
}

async function reserve(vehicleId: string): Promise<string> {
  const res = await call("POST", "/api/reservations", { vehicleId, modality: "hub" });
  expect(res.status).toBe(201);
  return (await json<{ reservation: { id: string } }>(res)).reservation.id;
}
const pay = (id: string) =>
  call("POST", "/api/payments", { ownerType: "reservation", ownerId: id });
const unlock = (vehicleId: string, reservationId: string) =>
  call("POST", "/api/unlock/sessions", { vehicleId, reservationId });

beforeAll(async () => {
  getDb();
  cookie = await login("cliente@demo.co");
});

describe("flujo del cliente (pago simulado)", () => {
  it("sin pagar el prepago no hay desbloqueo (402); pagado, sí", async () => {
    const vehicleId = rentable();
    const id = await reserve(vehicleId);
    expect((await unlock(vehicleId, id)).status).toBe(402);
    expect((await pay(id)).status).toBe(200);
    expect((await unlock(vehicleId, id)).status).toBe(201);
  });

  it("máximo una reserva abierta sin pagar: la nueva cancela la anterior y libera su vehículo", async () => {
    const a = rentable();
    const b = rentable();
    await reserve(a);
    await reserve(b);
    expect(repos.vehicles.byId(a)!.status).toBe("available");
    expect(repos.vehicles.byId(b)!.status).toBe("reserved");
    const list = await json<{ vehicle_id: string; status: string; prepaid: boolean }[]>(
      await call("GET", "/api/reservations"),
    );
    const unpaid = list.filter((r) => r.status === "requested" && !r.prepaid);
    expect(unpaid.map((r) => r.vehicle_id)).toEqual([b]);
  });

  it("una reserva pagada no se cancela por reservar otro vehículo", async () => {
    const id = await reserve(rentable());
    await pay(id);
    await reserve(rentable());
    expect(repos.reservations.byId(id)!.status).toBe("requested");
  });

  it("las solicitudes sin pagar de hace más de 30 min se cancelan al listar", async () => {
    const v = rentable();
    const id = uid("RES");
    repos.reservations.create({
      id,
      user_id: "USRA-CLIENTE1",
      vehicle_id: v,
      modality: "hub",
      address: null,
      status: "requested",
      requested_at: Date.now() - 40 * 60_000,
    });
    repos.vehicles.setStatus(v, "reserved");
    await call("GET", "/api/reservations");
    expect(repos.reservations.byId(id)!.status).toBe("cancelled");
    expect(repos.vehicles.byId(v)!.status).toBe("available");
  });

  it("el QR del vehículo se sirve y el código a mano acepta UMH:<id> o solo el id", async () => {
    const vehicleId = rentable();
    const svg = await handle(new Request(`${BASE}/api/vehicles/${vehicleId}/qr.svg`));
    expect(svg.headers.get("content-type")).toContain("image/svg+xml");
    const id = await reserve(vehicleId);
    await pay(id);
    for (const code of [`UMH:${vehicleId}`, vehicleId.toLowerCase(), ` ${vehicleId} `]) {
      const s = await json<{ id: string }>(await unlock(vehicleId, id));
      const res = await call("POST", `/api/unlock/sessions/${s.id}/qr`, { code });
      expect((await json<{ step: string }>(res)).step).toBe("helmet");
    }
    const s = await json<{ id: string }>(await unlock(vehicleId, id));
    const bad = await call("POST", `/api/unlock/sessions/${s.id}/qr`, { code: "UMH:OTRO" });
    expect(bad.status).toBe(400);
  });
});
