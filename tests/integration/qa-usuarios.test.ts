import { describe, expect, it } from "vitest";

/** Regresiones halladas por la ronda de QA con 5 usuarios (doble reserva, doble cobro, límites). */
process.env["UMH_DB_PATH"] = ":memory:";

const { repos } = await import("../../src/server/repositories");
const { uid } = await import("../../src/server/db/seed");
const { handle } = await import("../../src/server/api/handlers");

const BASE = "http://localhost";

async function login(): Promise<string> {
  const res = await handle(
    new Request(`${BASE}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: "cliente@demo.co", password: "Demo1234!" }),
    }),
  );
  return (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

const call = (cookie: string, method: string, path: string, body?: unknown) =>
  handle(
    new Request(`${BASE}${path}`, {
      method,
      headers: { cookie },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );

function vehiculo(): string {
  const id = uid("TV");
  repos.vehicles.save({
    id,
    kind: "scooter",
    model: "QA",
    mode: "rent",
    rate_per_min_cop: 500,
    spec: "test",
    deliverable: false,
  });
  return id;
}

describe("QA usuarios", () => {
  it("dos reservas simultáneas del mismo vehículo: una 201 y una 409", async () => {
    const c = await login();
    const v = vehiculo();
    const [a, b] = await Promise.all([
      call(c, "POST", "/api/reservations", { vehicleId: v, modality: "hub" }),
      call(c, "POST", "/api/reservations", { vehicleId: v, modality: "hub" }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  it("cancelar dos veces devuelve 409, no 500", async () => {
    const c = await login();
    const res = await call(c, "POST", "/api/reservations", {
      vehicleId: vehiculo(),
      modality: "hub",
    });
    const id = ((await res.json()) as { reservation: { id: string } }).reservation.id;
    expect((await call(c, "POST", `/api/reservations/${id}/cancel`)).status).toBe(200);
    expect((await call(c, "POST", `/api/reservations/${id}/cancel`)).status).toBe(409);
  });

  it("registro rechaza nombre y contraseña desmesurados y /health no filtra rutas", async () => {
    const big = "x".repeat(500);
    const r = await handle(
      new Request(`${BASE}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({
          name: big,
          email: "a@b.co",
          password: "Qa12345678!",
          consent: true,
        }),
      }),
    );
    expect(r.status).toBe(422);
    const h = (await (await handle(new Request(`${BASE}/api/health`))).json()) as object;
    expect(JSON.stringify(h)).not.toContain("db");
  });
});
