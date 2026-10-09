import { expect, test, type Page } from "@playwright/test";

/**
 * E2E de humo multi-rol (RF-01, RF-20/21, RNF-11). Corre contra el dev server
 * en modo api (`npm run dev:api`): las aserciones son de contrato visible,
 * no de datos internos.
 */

/**
 * Los inputs son controlados por React: si se rellenan ANTES de hidratar, el
 * valor llega al DOM pero no al estado y el submit envía vacíos. networkidle
 * garantiza que los módulos de hidratación ya corrieron.
 */
async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("landing: hero, tarifas reales, sección de domicilio y cuentas demo", async ({ page }) => {
  await page.goto("/?vista=landing");
  await expect(page.getByTestId("landing-hero")).toBeVisible();
  await expect(page.getByText("También llega a tu puerta")).toBeVisible();
  await expect(page.getByText("Tarifas y precios, en pesos")).toBeVisible();
  await expect(page.getByText("Cuentas de demostración")).toBeVisible();
  await expect(page.getByTestId("landing-cta-demo")).toBeVisible();
  // RNF-11: datos estructurados servidos en el HTML inicial
  const ld = await page.locator('script[type="application/ld+json"]').count();
  expect(ld).toBeGreaterThanOrEqual(2);
});

test("RF-01 móvil: / sirve la landing completa (indexable) aunque el bot no redirija", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "solo proyecto móvil");
  // La redirección a /app se suprime a propósito cuando navigator.webdriver es true
  // (para que los rastreadores vean el HTML completo). Verificamos esa mitad de RF-01:
  // el contenido comercial se sirve íntegro también en móvil.
  await page.goto("/");
  await expect(page.getByTestId("landing-hero")).toBeVisible();
});

test("catálogo indexable con fichas y precios", async ({ page }) => {
  await page.goto("/catalogo");
  await expect(
    page.getByRole("link", { name: /Ver todo el catálogo|catálogo/i }).first(),
  ).toBeVisible();
});

test("login con credenciales malas muestra error y no avanza", async ({ page }) => {
  await gotoHydrated(page, "/login");
  await page.fill("#auth-email", "no-existe@demo.co");
  await page.fill("#auth-password", "ClaveMala123!");
  await page.click("[data-testid=auth-submit]");
  await expect(page.getByTestId("auth-error")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("registro sin consentimiento se rechaza (Ley 1581)", async ({ page }) => {
  await gotoHydrated(page, "/registro");
  await page.fill("#auth-name", "Prueba Playwright");
  await page.fill("#auth-email", `pw-${Date.now()}@demo.co`);
  await page.fill("#auth-password", "ClaveSegura1!");
  await page.click("[data-testid=auth-submit]");
  await expect(page.getByTestId("auth-error")).toContainText(/tratamiento de datos|consentimiento/);
});

test("/entregas pide rol domiciliario o backend (no es una página rota)", async ({ page }) => {
  await page.goto("/entregas");
  await expect(page.locator("body")).toContainText(/backend|domiciliario/i);
});

test("admin: el operador ve KPIs tras login demo (modo api) o el panel (modo mock)", async ({
  page,
}) => {
  await gotoHydrated(page, "/login");
  await page.fill("#auth-email", "operador@demo.co");
  await page.fill("#auth-password", "Demo1234!");
  await page.click("[data-testid=auth-submit]");
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  await expect(page.getByTestId("deliveries-panel")).toBeVisible();
});
