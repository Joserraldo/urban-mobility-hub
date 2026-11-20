import { expect, test, type Page } from "@playwright/test";

/**
 * Flujo del cliente de punta a punta (docs/FLUJOS-CLIENTE.md): reservar -> pagar (pasarela simulada)
 * -> ver dónde está y «Desbloquear» -> código escrito a mano -> casco -> viaje -> finalizar; y compra.
 * Requiere el backend en modo api SIN llaves BOLD_* (pago simulado) y UMH_SEED_DEMO=1.
 * Capturas: SHOTS_DIR (por defecto tests/results/e2e-artifacts/flujo-cliente).
 */
const SHOTS = process.env["SHOTS_DIR"] ?? "tests/results/e2e-artifacts/flujo-cliente";
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", "Demo1234!");
  await page.click("[data-testid=auth-submit]");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

const api = async <T>(page: Page, path: string): Promise<T> =>
  (await (await page.request.get(path)).json()) as T;

test.describe.configure({ mode: "serial" });

test("reservar, pagar, desbloquear con el código a mano, viajar y terminar", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "flujo completo solo en escritorio");
  test.setTimeout(120_000);
  await login(page, "cliente@demo.co");
  await page.goto("/app");
  await page.waitForLoadState("networkidle");

  // 1. Elegir el vehículo más cercano y reservarlo (el prepago se cobra con la pasarela simulada).
  await page.getByTestId("btn-nearest").click();
  const reserveBtn = page.locator('[data-testid^="btn-reserve-"]').first();
  await expect(reserveBtn).toBeVisible({ timeout: 20_000 });
  const vehicleId = (await reserveBtn.getAttribute("data-testid"))!.replace("btn-reserve-", "");
  await reserveBtn.click();
  await page.getByTestId("checkout-confirm").click();
  await expect(page.getByTestId("reservation-status")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("payment-ref")).toContainText("Prepago aprobado");
  await expect(page.getByTestId("reserve-unlock")).toBeVisible();
  await expect(page.getByTestId("reserve-directions")).toHaveAttribute(
    "href",
    /google\.com\/maps\/dir\/.*destination=-?\d/,
  );
  await shot(page, "01-reserva-pagada");

  // 2. El panel del mapa y Mis reservas muestran la reserva pagada con Desbloquear y Cómo llegar.
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("open-reservations")).toBeVisible();
  await shot(page, "02-panel-mapa");
  await page.goto("/mis-reservas");
  await page.waitForLoadState("networkidle");
  const requested = page.locator('[data-testid^="reservation-RES"][data-status="requested"]');
  const card = requested.first();
  await expect(card).toContainText(vehicleId);
  await expect(card.getByTestId("reservation-payment")).toHaveAttribute("data-paid", "true");
  await expect(card.locator('[data-testid^="reservation-directions-"]')).toBeVisible();
  // Las reservas viejas sin pagar no se acumulan: solo hay una abierta.
  await expect(requested).toHaveCount(1);
  await shot(page, "03-mis-reservas");

  // 3. Desbloquear ESA reserva: código a mano (solo el id, en minúsculas y con espacios).
  await card.locator('[data-testid^="reservation-unlock-"]').click();
  await expect(page.getByTestId("unlock-step-qr")).toBeVisible();
  await page.getByTestId("unlock-input-code").fill(`  ${vehicleId.toLowerCase()} `);
  await shot(page, "04-qr-manual");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByTestId("unlock-step-helmet")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("unlock-btn-helmet").click();
  await expect(page.getByTestId("unlock-step-ready")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("unlock-btn-start").click();
  await expect(page.getByTestId("unlock-trip")).toBeVisible();
  await expect(page.getByTestId("reservation-status")).toHaveText("Activa");
  await shot(page, "05-viaje-en-curso");
  const mid = await api<{ status: string }>(page, `/api/vehicles/${vehicleId}`);
  expect(mid.status).toBe("in_use");

  // 4. Terminar el viaje: reserva completada y vehículo disponible.
  await page.getByTestId("trip-finish").click();
  await expect(page.getByTestId("reservation-status")).toHaveText("Completada", {
    timeout: 15_000,
  });
  await shot(page, "06-viaje-finalizado");
  const end = await api<{ status: string }>(page, `/api/vehicles/${vehicleId}`);
  expect(end.status).toBe("available");
});

test("reservas sin pagar: máximo una abierta y «Pagar prepago» la habilita", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "solo escritorio");
  await login(page, "cliente2@demo.co");
  type V = { id: string; mode: string; status: string; alert: string };
  const vs = (await api<V[]>(page, "/api/vehicles")).filter(
    (v) => v.mode === "rent" && v.status === "available" && v.alert === "ok",
  );
  const [a, b] = [vs[0]!, vs[1]!];
  // Reservas creadas por API sin pagar (como un cliente que abandona el pago a medias).
  const post = (data: Record<string, unknown>) => page.request.post("/api/reservations", { data });
  expect((await post({ vehicleId: a.id, modality: "hub" })).status()).toBe(201);
  expect((await post({ vehicleId: b.id, modality: "hub" })).status()).toBe(201);
  type R = { id: string; vehicle_id: string; status: string; prepaid: boolean };
  const list = await api<R[]>(page, "/api/reservations");
  expect(list.filter((r) => r.status === "requested" && r.vehicle_id === a.id)).toHaveLength(0);
  const open = list.filter((r) => r.status === "requested" && !r.prepaid);
  expect(open.map((r) => r.vehicle_id)).toEqual([b.id]);
  expect((await api<V>(page, `/api/vehicles/${a.id}`)).status).toBe("available");

  await page.goto("/mis-reservas");
  await page.waitForLoadState("networkidle");
  const card = page.locator(`[data-testid="reservation-${open[0]!.id}"]`);
  await expect(card.getByTestId("reservation-payment")).toHaveAttribute("data-paid", "false");
  await expect(card.locator('[data-testid^="reservation-unlock-"]')).toHaveCount(0);
  await shot(page, "07-sin-pagar");
  await card.locator('[data-testid^="reservation-pay-"]').click();
  await expect(card.locator('[data-testid^="reservation-unlock-"]')).toBeVisible({
    timeout: 15_000,
  });
  await shot(page, "08-pagada-tras-reintento");
  // Limpieza: cancelar libera el vehículo.
  await card.locator('[data-testid^="reservation-cancel-"]').click();
  await expect(card)
    .toHaveCount(0, { timeout: 10_000 })
    .catch(() => undefined);
  const after = await api<R[]>(page, "/api/reservations");
  expect(after.filter((r) => r.status === "requested")).toHaveLength(0);
});

test("compra de un vehículo en venta: queda pagado y vendido", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "solo escritorio");
  await login(page, "cliente3@demo.co");
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("mode-buy").click();
  await page.getByTestId("catalog-toggle").click();
  const buy = page.locator('[data-testid^="btn-buy-"]').first();
  await expect(buy).toBeVisible({ timeout: 20_000 });
  const vehicleId = (await buy.getAttribute("data-testid"))!.replace("btn-buy-", "");
  await buy.click();
  await page.getByTestId("checkout-confirm").click();
  await expect(page.getByTestId("purchase-status")).toBeVisible({ timeout: 15_000 });
  await shot(page, "09-compra");
  const purchases = await api<{ vehicle_id: string; status: string }[]>(page, "/api/purchases");
  expect(purchases.find((p) => p.vehicle_id === vehicleId)?.status).toBe("paid");
  expect((await api<{ status: string }>(page, `/api/vehicles/${vehicleId}`)).status).toBe("sold");
});
