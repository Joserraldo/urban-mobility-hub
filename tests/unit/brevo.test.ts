import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * RF-27 / UC19: el aviso de retraso nunca rompe la operación.
 * BD en memoria (:memory: + seed); se import DESPUÉS de fijar el entorno.
 */
process.env["UMH_DB_PATH"] = ":memory:";
delete process.env["BREVO_API_KEY"];

const { getDb } = await import("../../src/server/db");
const { repos } = await import("../../src/server/repositories");
const { uid } = await import("../../src/server/db/seed");
const { notifyLateDelivery, __setFetch } = await import("../../src/server/services/brevo");

function makeLateDelivery() {
  const now = Date.now();
  const res = {
    id: uid("RES"),
    user_id: "USRA-CLIENTE1",
    vehicle_id: "SC-1088",
    modality: "delivery",
    address: "Calle 45 #1-23",
    status: "requested",
    requested_at: now,
  };
  repos.reservations.create(res);
  const d = {
    id: uid("DEL"),
    reservation_id: res.id,
    courier_id: "USRD-DOMI1",
    status: "late",
    deadline_at: now - 60_000,
    assigned_at: now - 90_000,
  };
  repos.deliveries.create(d);
  return d.id;
}

describe("brevo.ts — UC19 notificar retraso", () => {
  beforeAll(() => {
    getDb(); // aplica schema + seed
  });

  it("sin BREVO_API_KEY deja las notificaciones como `simulated` (cliente y operador) y no lanza", async () => {
    const deliveryId = makeLateDelivery();
    await expect(
      notifyLateDelivery(deliveryId, {
        customerEmail: "cliente@demo.co",
        customerName: "Ana",
        operatorEmail: "operador@demo.co",
        courierName: "Diana",
        vehicleModel: "Volt S2",
        address: "Calle 45 #1-23",
        minutesLate: 3,
      }),
    ).resolves.toBeUndefined();

    const notifs = repos.notifications.list(50).filter((n) => n.delivery_id === deliveryId);
    expect(notifs.length).toBe(2); // cliente + operador
    expect(notifs.every((n) => n.status === "simulated")).toBe(true);
  });

  it("no duplica el aviso de una misma entrega+plantilla+destino (RF-27 anti-spam)", async () => {
    const deliveryId = makeLateDelivery();
    const notice = {
      customerEmail: "cliente@demo.co",
      customerName: "Ana",
      operatorEmail: "operador@demo.co",
      courierName: "Diana",
      vehicleModel: "Volt S2",
      address: "x",
      minutesLate: 1,
    };
    await notifyLateDelivery(deliveryId, notice);
    await notifyLateDelivery(deliveryId, notice);
    const notifs = repos.notifications.list(200).filter((n) => n.delivery_id === deliveryId);
    expect(notifs.length).toBe(2); // sigue habiendo exactamente una por destinatario
  });

  it("con fetch que responde 200 marca `sent` con provider_id", async () => {
    const deliveryId = makeLateDelivery();
    const fake = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ messageId: "MSG-42" }), { status: 200 })),
      );
    __setFetch(fake);
    try {
      process.env["BREVO_API_KEY"] = "xkey-test";
      await notifyLateDelivery(deliveryId, {
        customerEmail: "cliente@demo.co",
        customerName: "Ana",
        operatorEmail: "operador@demo.co",
        courierName: "Diana",
        vehicleModel: "Volt S2",
        address: "x",
        minutesLate: 1,
      });
      const notifs = repos.notifications.list(200).filter((n) => n.delivery_id === deliveryId);
      expect(notifs.every((n) => n.status === "sent")).toBe(true);
      expect(fake).toHaveBeenCalledTimes(2);
      const call = fake.mock.calls[0] as [string, RequestInit];
      expect(String(call[0])).toContain("api.brevo.com/v3/smtp/email");
      expect((call[1].headers as Record<string, string>)["api-key"]).toBe("xkey-test");
    } finally {
      delete process.env["BREVO_API_KEY"];
      __setFetch(undefined);
    }
  });

  it("con fetch que falla (500) marca `failed` con error y NO cambia el estado de la entrega", async () => {
    const deliveryId = makeLateDelivery();
    __setFetch(
      vi.fn().mockImplementation(() => Promise.resolve(new Response("boom", { status: 500 }))),
    );
    try {
      process.env["BREVO_API_KEY"] = "xkey-test";
      await notifyLateDelivery(deliveryId, {
        customerEmail: "cliente@demo.co",
        customerName: "Ana",
        operatorEmail: "operador@demo.co",
        courierName: "Diana",
        vehicleModel: "Volt S2",
        address: "x",
        minutesLate: 1,
      });
      const notifs = repos.notifications.list(200).filter((n) => n.delivery_id === deliveryId);
      expect(notifs.every((n) => n.status === "failed")).toBe(true);
      expect(repos.deliveries.byId(deliveryId)!.status).toBe("late"); // intacta
    } finally {
      delete process.env["BREVO_API_KEY"];
      __setFetch(undefined);
    }
  });
});
