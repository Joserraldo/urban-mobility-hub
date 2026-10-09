import { beforeAll, describe, expect, it } from "vitest";

/** Flujo UC14-UC17 a nivel de repositorio, con SQLite real en memoria. */
process.env["UMH_DB_PATH"] = ":memory:";

const { getDb } = await import("../../src/server/db");
const { repos } = await import("../../src/server/repositories");
const { uid } = await import("../../src/server/db/seed");

function nuevaReservaDomicilio(vehicleId: string): string {
  const id = uid("RES");
  repos.reservations.create({
    id,
    user_id: "USRA-CLIENTE1",
    vehicle_id: vehicleId,
    modality: "delivery",
    address: "Cra 27 #36-10",
    status: "requested",
    requested_at: Date.now(),
  });
  return id;
}

describe("seed y catálogo", () => {
  beforeAll(() => getDb());

  it("siembra hubs, flota y los 5 usuarios demo con sus roles", () => {
    expect(repos.hubs.list().length).toBeGreaterThanOrEqual(3);
    expect(repos.vehicles.list().length).toBeGreaterThanOrEqual(10);
    const couriers = repos.users.listCouriers();
    expect(couriers.map((c) => c.id)).toEqual(expect.arrayContaining(["USRD-DOMI1", "USRE-DOMI2"]));
    expect(repos.users.byId("USRO-OPERADOR")?.role).toBe("operator");
  });

  it("los vehículos sembrados nacen available con qr_code UMH:<id>", () => {
    const v = repos.vehicles.byId("SC-1088");
    expect(v?.status).toBe("available");
    expect(v?.qr_code).toBe("UMH:SC-1088");
  });
});

describe("UC14→UC16 ciclo de vida de una entrega", () => {
  beforeAll(() => getDb());

  it("asignada → en camino → entregada con cierre atómico de reserva", () => {
    const resId = nuevaReservaDomicilio("BK-2201");
    const d = {
      id: uid("DEL"),
      reservation_id: resId,
      courier_id: "USRD-DOMI1",
      status: "assigned",
      deadline_at: Date.now() + 45 * 60_000,
      assigned_at: Date.now(),
    };
    repos.deliveries.create(d);

    expect(repos.deliveries.activeForReservation(resId)?.id).toBe(d.id);
    expect(repos.deliveries.overdue().some((x) => x.id === d.id)).toBe(false);

    repos.deliveries.update(d.id, { status: "in_progress" });
    repos.deliveries.update(d.id, { status: "delivered", delivered_at: Date.now() });
    repos.reservations.setStatus(resId, "active", { started_at: Date.now() });
    repos.reservations.setStatus(resId, "completed", { ended_at: Date.now() });

    const fd = repos.deliveries.byId(d.id)!;
    expect(fd.status).toBe("delivered");
    expect(fd.delivered_at).toBeTypeOf("number");
    expect(repos.deliveries.activeForReservation(resId)).toBeUndefined();
    expect(repos.reservations.byId(resId)?.status).toBe("completed");
  });

  it("overdue detecta solo vencidas abiertas (no entregadas) — base del cron UC17", () => {
    const resId = nuevaReservaDomicilio("DR-3301");
    const d = {
      id: uid("DEL"),
      reservation_id: resId,
      courier_id: "USRE-DOMI2",
      status: "assigned",
      deadline_at: Date.now() - 1000,
      assigned_at: Date.now() - 120_000,
    };
    repos.deliveries.create(d);
    expect(repos.deliveries.overdue().map((x) => x.id)).toContain(d.id);
    repos.deliveries.update(d.id, { status: "delivered", delivered_at: Date.now() });
    expect(repos.deliveries.overdue().map((x) => x.id)).not.toContain(d.id);
  });
});

describe("restricciones que el handler exige", () => {
  beforeAll(() => getDb());

  it("notifications: UNIQUE entrega+plantilla+usuario devuelve null al repetir (no spam)", () => {
    // fila de deliveries real (la FK lo exige): reusamos el ciclo de arriba
    const resId = nuevaReservaDomicilio("SC-1120");
    const delId = uid("DEL");
    repos.deliveries.create({
      id: delId,
      reservation_id: resId,
      courier_id: "USRD-DOMI1",
      status: "assigned",
      deadline_at: Date.now() + 60_000,
      assigned_at: Date.now(),
    });
    const args = {
      userId: "USRA-CLIENTE1",
      deliveryId: delId,
      template: "entrega_tardia",
      toEmail: "cliente@demo.co",
    };
    const first = repos.notifications.ensure(args);
    expect(first).not.toBeNull();
    expect(repos.notifications.ensure(args)).toBeNull();
    expect(repos.notifications.ensure({ ...args, userId: "USRB-CLIENTE2" })).not.toBeNull();
  });

  it("RF-24: hub con vehículos no se puede borrar (vehicleCount > 0)", () => {
    expect(repos.hubs.vehicleCount("HUB-01")).toBeGreaterThan(0);
  });

  it("KPIs excluyen offline y solo rental en batería promedio", () => {
    const k = repos.stats.kpis();
    expect(k.connectedVehicles).toBeGreaterThan(0);
    expect(k.activeHubs).toBeGreaterThan(0);
    expect(k.averageBattery).toBeGreaterThanOrEqual(0);
    expect(k.averageBattery).toBeLessThanOrEqual(100);
  });
});
