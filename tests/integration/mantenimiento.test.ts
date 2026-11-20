import { beforeAll, describe, expect, it } from "vitest";

/**
 * Módulo de mantenimiento y telemetría histórica: reglas de estado, cierre de órdenes,
 * visibilidad para el cliente, throttle del historial y migración del CHECK de `vehicles`.
 */
process.env["UMH_DB_PATH"] = ":memory:";

const { getDb, migrateVehicleStatus } = await import("../../src/server/db");
const { repos } = await import("../../src/server/repositories");
const { uid } = await import("../../src/server/db/seed");
const { handle } = await import("../../src/server/api/handlers");
const { logTelemetry, resetTelemetryThrottle, TELEMETRY_MIN_INTERVAL_MS } =
  await import("../../src/server/services/fleet-sim");
const { DatabaseSync } = await import("node:sqlite");

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

function nuevoVehiculo(status = "available"): string {
  const id = uid("MV");
  repos.vehicles.save({
    id,
    kind: "scooter",
    model: "Prueba",
    mode: "rent",
    rate_per_min_cop: 500,
    spec: "test",
    status,
  });
  return id;
}

let cliente = "";
let operador = "";

beforeAll(async () => {
  getDb();
  cliente = await login("cliente@demo.co");
  operador = await login("operador@demo.co");
});

describe("mantenimiento de vehículos", () => {
  it("no se puede enviar a mantenimiento un vehículo en viaje (in_use)", async () => {
    const id = nuevoVehiculo("in_use");
    const res = await call(operador, "POST", `/api/admin/vehicles/${id}/maintenance`, {
      reason: "Llanta",
    });
    expect(res.status).toBe(409);
    expect(repos.vehicles.byId(id)?.status).toBe("in_use");
  });

  it("el PATCH a offline tampoco pasa si hay viaje activo", async () => {
    const id = nuevoVehiculo("in_use");
    const res = await call(operador, "PATCH", `/api/admin/vehicles/${id}/status`, {
      status: "offline",
    });
    expect(res.status).toBe(409);
  });

  it("solo el operador puede usar los endpoints", async () => {
    const id = nuevoVehiculo();
    const res = await call(cliente, "POST", `/api/admin/vehicles/${id}/maintenance`, {
      reason: "x",
    });
    expect(res.status).toBe(403);
  });

  it("enviar a mantenimiento exige motivo, cancela reservas y no se repite", async () => {
    const id = nuevoVehiculo("reserved");
    const resId = uid("RES");
    repos.reservations.create({
      id: resId,
      user_id: "USRA-CLIENTE1",
      vehicle_id: id,
      modality: "hub",
      address: null,
      status: "requested",
      requested_at: Date.now(),
    });
    const sinMotivo = await call(operador, "POST", `/api/admin/vehicles/${id}/maintenance`, {});
    expect(sinMotivo.status).toBe(422);

    const ok = await call(operador, "POST", `/api/admin/vehicles/${id}/maintenance`, {
      reason: "Frenos",
    });
    expect(ok.status).toBe(201);
    expect((await ok.json()).cancelled).toBe(1);
    expect(repos.vehicles.byId(id)?.status).toBe("maintenance");
    expect(repos.reservations.byId(resId)?.status).toBe("cancelled");

    const otra = await call(operador, "POST", `/api/admin/vehicles/${id}/maintenance`, {
      reason: "Otra",
    });
    expect(otra.status).toBe(409);
  });

  it("cerrar la orden deja el vehículo available y la alerta en ok", async () => {
    const id = nuevoVehiculo();
    repos.vehicles.updateLive(id, 7.1, -73.1, 5, "low_battery");
    const abre = await call(operador, "POST", `/api/admin/vehicles/${id}/maintenance`, {
      reason: "Batería",
    });
    const { order } = await abre.json();

    const sinRes = await call(operador, "POST", `/api/admin/maintenance/${order.id}/close`, {});
    expect(sinRes.status).toBe(422);

    const cierra = await call(operador, "POST", `/api/admin/maintenance/${order.id}/close`, {
      resolution: "Batería cambiada",
    });
    expect(cierra.status).toBe(200);
    const v = repos.vehicles.byId(id);
    expect(v?.status).toBe("available");
    expect(v?.alert_state).toBe("ok");

    const dos = await call(operador, "POST", `/api/admin/maintenance/${order.id}/close`, {
      resolution: "otra",
    });
    expect(dos.status).toBe(409);

    const lista = await (await call(operador, "GET", "/api/admin/maintenance")).json();
    expect(lista.closed.some((o: { id: string }) => o.id === order.id)).toBe(true);
    expect(lista.open.some((o: { id: string }) => o.id === order.id)).toBe(false);
  });

  it("PATCH a maintenance crea la orden 'Retiro manual'", async () => {
    const id = nuevoVehiculo();
    const res = await call(operador, "PATCH", `/api/admin/vehicles/${id}/status`, {
      status: "maintenance",
    });
    expect(res.status).toBe(200);
    expect(repos.maintenance.openByVehicle(id)?.reason).toBe("Retiro manual");
  });

  it("el cliente no ve vehículos en mantenimiento, el operador sí; no se reserva", async () => {
    const id = nuevoVehiculo("maintenance");
    const delCliente = (await (await call(cliente, "GET", "/api/vehicles")).json()) as {
      id: string;
    }[];
    const delOperador = (await (await call(operador, "GET", "/api/vehicles")).json()) as {
      id: string;
    }[];
    expect(delCliente.some((v) => v.id === id)).toBe(false);
    expect(delOperador.some((v) => v.id === id)).toBe(true);

    const reserva = await call(cliente, "POST", "/api/reservations", {
      vehicleId: id,
      modality: "hub",
    });
    expect(reserva.status).toBeGreaterThanOrEqual(400);
    expect(repos.vehicles.byId(id)?.status).toBe("maintenance");
  });
});

describe("historial de telemetría", () => {
  const muestra = (vehicleId: string, battery: number) => ({
    vehicleId,
    ts: 0,
    lat: 7.1,
    lng: -73.1,
    battery,
    speedKmh: 15,
    helmetOn: true,
    impactG: 1,
    gpsFixAgeMs: 0,
    tripActive: true,
  });

  it("throttle: máximo una fila por vehículo cada 10 s", () => {
    resetTelemetryThrottle();
    const id = nuevoVehiculo();
    const t0 = 1_000_000_000_000;
    expect(logTelemetry(muestra(id, 90), "ok", t0)).toBe(true);
    expect(logTelemetry(muestra(id, 89), "ok", t0 + 2_000)).toBe(false);
    expect(logTelemetry(muestra(id, 88), "ok", t0 + TELEMETRY_MIN_INTERVAL_MS - 1)).toBe(false);
    expect(logTelemetry(muestra(id, 87), "ok", t0 + TELEMETRY_MIN_INTERVAL_MS)).toBe(true);
    expect(repos.telemetry.since(id, 0)).toHaveLength(2);
  });

  it("poda lo anterior a 24 h y el endpoint filtra por minutos", async () => {
    resetTelemetryThrottle();
    const id = nuevoVehiculo();
    const now = Date.now();
    repos.telemetry.insert({
      vehicle_id: id,
      ts: now - 3 * 60 * 60_000,
      lat: 0,
      lng: 0,
      battery: 50,
      speed_kmh: 0,
      helmet_on: 1,
      impact_g: 1,
      alert: "ok",
    });
    expect(logTelemetry(muestra(id, 80), "ok", now)).toBe(true);
    const res = await call(operador, "GET", `/api/admin/vehicles/${id}/telemetry?minutes=60`);
    const rows = (await res.json()) as { battery: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.battery).toBe(80);
    const cli = await call(cliente, "GET", `/api/admin/vehicles/${id}/telemetry`);
    expect(cli.status).toBe(403);
  });
});

describe("migración del CHECK de status", () => {
  it("recrea vehicles con 'maintenance', conserva filas y es idempotente", () => {
    const d = new DatabaseSync(":memory:");
    d.exec(`CREATE TABLE hubs (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'available'
          CHECK (status IN ('available','reserved','in_use','sold','offline'))
      );
      INSERT INTO vehicles (id, status) VALUES ('A','in_use');`);
    migrateVehicleStatus(d);
    d.exec("UPDATE vehicles SET status='maintenance' WHERE id='A'");
    expect(
      (d.prepare("SELECT status FROM vehicles WHERE id='A'").get() as { status: string }).status,
    ).toBe("maintenance");
    migrateVehicleStatus(d);
    expect((d.prepare("SELECT COUNT(*) AS n FROM vehicles").get() as { n: number }).n).toBe(1);
  });
});
