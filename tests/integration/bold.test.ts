import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Pagos con Bold: link de pago + webhook firmado. `fetch` se simula (no sale a internet) y se
 * usan llaves de prueba ficticias: en sandbox Bold firma el webhook con llave vacía.
 */
process.env["UMH_DB_PATH"] = ":memory:";
process.env["BOLD_IDENTITY_KEY"] = "llave-identidad-prueba";
process.env["BOLD_SECRET_KEY"] = "";
process.env["BOLD_ENV"] = "test";
process.env["UMH_PUBLIC_URL"] = "https://sitio.test";

const { getDb } = await import("../../src/server/db");
const { repos } = await import("../../src/server/repositories");
const { uid } = await import("../../src/server/db/seed");
const { handle } = await import("../../src/server/api/handlers");
const { signBoldBody, verifyWebhookSignature, createPaymentLink, boldConfig } =
  await import("../../src/server/services/bold");

const BASE = "http://localhost";
let linkSeq = 0;

/** Simula la API de Bold: crea links LNK_n y guarda lo enviado. */
function mockBold(status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      linkSeq += 1;
      const id = `LNK_TEST${linkSeq}`;
      if (status !== 200)
        return new Response(JSON.stringify({ errors: [{ message: "llave inválida" }] }), {
          status,
        });
      return new Response(
        JSON.stringify({
          payload: { payment_link: id, url: `https://checkout.bold.co/${id}` },
          errors: [],
        }),
        { status: 200 },
      );
    }),
  );
  return calls;
}

async function login(email: string): Promise<string> {
  const res = await handle(
    new Request(`${BASE}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "Demo1234!" }),
    }),
  );
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

function webhook(linkId: string, type: string, signature?: string) {
  const raw = JSON.stringify({
    id: uid("EVT"),
    type,
    subject: "PAY-BOLD-1",
    data: { payment_id: "PAY-BOLD-1", metadata: { reference: linkId } },
  });
  return handle(
    new Request(`${BASE}/api/payments/bold/webhook`, {
      method: "POST",
      headers: { "x-bold-signature": signature ?? signBoldBody(raw, "") },
      body: raw,
    }),
  );
}

let cliente = "";

beforeAll(async () => {
  getDb();
  cliente = await login("cliente@demo.co");
});
afterEach(() => vi.unstubAllGlobals());

function ventaDisponible(): string {
  const id = uid("TV");
  repos.vehicles.save({
    id,
    kind: "scooter",
    model: "Venta Bold",
    mode: "sale",
    price_cop: 1_500_000,
    spec: "test",
  });
  return id;
}

function reservaPendiente(): string {
  const id = uid("RES");
  const vId = uid("TV");
  repos.vehicles.save({
    id: vId,
    kind: "scooter",
    model: "Renta",
    mode: "rent",
    rate_per_min_cop: 500,
    spec: "t",
  });
  repos.reservations.create({
    id,
    user_id: "USRA-CLIENTE1",
    vehicle_id: vId,
    modality: "hub",
    address: null,
    status: "requested",
    requested_at: Date.now(),
  });
  repos.vehicles.setStatus(vId, "reserved");
  return id;
}

describe("firma del webhook", () => {
  it("acepta la firma HMAC-SHA256 de base64(cuerpo) y rechaza otra", () => {
    const body = '{"type":"SALE_APPROVED"}';
    const sig = signBoldBody(body, "secreto");
    expect(verifyWebhookSignature(body, sig, "secreto")).toBe(true);
    expect(verifyWebhookSignature(body, sig, "otro")).toBe(false);
    expect(verifyWebhookSignature(body, null, "secreto")).toBe(false);
    expect(verifyWebhookSignature(`${body} `, sig, "secreto")).toBe(false);
  });
});

describe("createPaymentLink", () => {
  it("envía la llave de identidad y el monto, y devuelve el checkout", async () => {
    const calls = mockBold();
    const cfg = boldConfig();
    expect(cfg).toBeDefined();
    const link = await createPaymentLink(cfg!, {
      reference: "BLD-1",
      amountCop: 12_000,
      description: "Prepago",
      returnPath: "/pago/resultado?order=BLD-1",
    });
    expect(link.checkoutUrl).toContain("https://checkout.bold.co/LNK_TEST");
    const sent = calls[0]!;
    expect(sent.url).toBe("https://integrations.api.bold.co/online/link/v1");
    expect((sent.init.headers as Record<string, string>)["Authorization"]).toBe(
      "x-api-key llave-identidad-prueba",
    );
    const payload = JSON.parse(String(sent.init.body)) as {
      amount: { total_amount: number };
      callback_url: string;
    };
    expect(payload.amount.total_amount).toBe(12_000);
    expect(payload.callback_url).toBe("https://sitio.test/pago/resultado?order=BLD-1");
  });

  it("traduce un error de Bold a una falla clara", async () => {
    mockBold(401);
    await expect(
      createPaymentLink(boldConfig()!, {
        reference: "X",
        amountCop: 1,
        description: "d",
        returnPath: "/x",
      }),
    ).rejects.toThrow(/llave inválida/);
  });
});

describe("compra con Bold", () => {
  it("crea el link, queda pendiente y el webhook aprobado la paga una sola vez", async () => {
    mockBold();
    const vehicleId = ventaDisponible();
    const created = await call(cliente, "POST", "/api/purchases", { vehicleId });
    const { purchase } = (await created.json()) as { purchase: { id: string } };

    const pay = await call(cliente, "POST", "/api/payments", {
      ownerType: "purchase",
      ownerId: purchase.id,
    });
    expect(pay.status).toBe(202);
    const out = (await pay.json()) as { orderId: string; checkoutUrl: string };
    expect(out.checkoutUrl).toMatch(/^https:\/\/checkout\.bold\.co\//);
    expect(repos.purchases.byId(purchase.id)?.status).toBe("pending");

    const order = repos.boldOrders.byId(out.orderId)!;
    expect((await webhook(order.link_id, "SALE_APPROVED")).status).toBe(200);
    expect(repos.purchases.byId(purchase.id)?.status).toBe("paid");
    expect(repos.vehicles.byId(vehicleId)?.status).toBe("sold");

    // Bold repite el webhook: no debe duplicar el pago.
    await webhook(order.link_id, "SALE_APPROVED");
    const approved = repos.payments
      .byOwner("purchase", purchase.id)
      .filter((p) => p["status"] === "approved");
    expect(approved).toHaveLength(1);

    const status = await call(cliente, "GET", `/api/payments/bold/${out.orderId}`);
    expect(((await status.json()) as { status: string }).status).toBe("approved");
  });

  it("rechaza un webhook con firma inválida y no cambia nada", async () => {
    mockBold();
    const vehicleId = ventaDisponible();
    const created = await call(cliente, "POST", "/api/purchases", { vehicleId });
    const { purchase } = (await created.json()) as { purchase: { id: string } };
    const pay = await call(cliente, "POST", "/api/payments", {
      ownerType: "purchase",
      ownerId: purchase.id,
    });
    const { orderId } = (await pay.json()) as { orderId: string };
    const order = repos.boldOrders.byId(orderId)!;
    expect((await webhook(order.link_id, "SALE_APPROVED", "00".repeat(32))).status).toBe(401);
    expect(repos.purchases.byId(purchase.id)?.status).toBe("pending");
  });

  it("un rechazo de Bold deja la orden pendiente (el usuario puede reintentar)", async () => {
    mockBold();
    const vehicleId = ventaDisponible();
    const created = await call(cliente, "POST", "/api/purchases", { vehicleId });
    const { purchase } = (await created.json()) as { purchase: { id: string } };
    const pay = await call(cliente, "POST", "/api/payments", {
      ownerType: "purchase",
      ownerId: purchase.id,
    });
    const { orderId } = (await pay.json()) as { orderId: string };
    const order = repos.boldOrders.byId(orderId)!;
    await webhook(order.link_id, "SALE_REJECTED");
    expect(repos.boldOrders.byId(orderId)?.status).toBe("pending");
    expect(repos.purchases.byId(purchase.id)?.status).toBe("pending");
  });

  it("si Bold no responde, la compra sigue pendiente y el error es claro", async () => {
    mockBold(500);
    const vehicleId = ventaDisponible();
    const created = await call(cliente, "POST", "/api/purchases", { vehicleId });
    const { purchase } = (await created.json()) as { purchase: { id: string } };
    const pay = await call(cliente, "POST", "/api/payments", {
      ownerType: "purchase",
      ownerId: purchase.id,
    });
    expect(pay.status).toBe(502);
    expect(repos.purchases.byId(purchase.id)?.status).toBe("pending");
  });
});

describe("prepago de reserva con Bold", () => {
  it("no permite pagar dos veces el mismo prepago aprobado", async () => {
    mockBold();
    const resId = reservaPendiente();
    const pay = await call(cliente, "POST", "/api/payments", {
      ownerType: "reservation",
      ownerId: resId,
    });
    expect(pay.status).toBe(202);
    const { orderId } = (await pay.json()) as { orderId: string };
    await webhook(repos.boldOrders.byId(orderId)!.link_id, "SALE_APPROVED");
    const again = await call(cliente, "POST", "/api/payments", {
      ownerType: "reservation",
      ownerId: resId,
    });
    expect(again.status).toBe(409);
  });

  it("no deja desbloquear mientras el prepago no esté aprobado", async () => {
    const resId = reservaPendiente();
    const r = repos.reservations.byId(resId)!;
    const res = await call(cliente, "POST", "/api/unlock/sessions", {
      vehicleId: r.vehicle_id,
      reservationId: resId,
    });
    expect(res.status).toBe(402);
  });

  it("reutiliza el link pendiente en vez de crear uno nuevo al reintentar", async () => {
    const calls = mockBold();
    const resId = reservaPendiente();
    const body = { ownerType: "reservation", ownerId: resId };
    const a = (await (await call(cliente, "POST", "/api/payments", body)).json()) as {
      orderId: string;
    };
    const b = (await (await call(cliente, "POST", "/api/payments", body)).json()) as {
      orderId: string;
    };
    expect(b.orderId).toBe(a.orderId);
    expect(calls).toHaveLength(1);
  });
});
