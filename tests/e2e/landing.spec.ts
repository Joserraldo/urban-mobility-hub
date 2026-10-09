import { expect, test, type Page } from "@playwright/test";

async function gotoLanding(page: Page) {
  // No se usa networkidle: la landing carga muchas imágenes lazy y un servidor
  // local no llega a "red quieta" de forma estable; se espera el hero (SSR/hidratado).
  await page.goto("/?vista=landing");
  await page.waitForLoadState("load");
  await expect(page.getByTestId("landing-hero")).toBeVisible();
  await page.waitForTimeout(600);
}

test("landing v2: hero, marquee, imágenes reales cargadas y sin overflow horizontal", async ({
  page,
}) => {
  await gotoLanding(page);
  await expect(page.getByTestId("landing-hero")).toBeVisible();
  await expect(page.getByText("La flota, en fotos reales")).toBeVisible();
  await expect(page.locator(".marquee-track")).toBeVisible();

  // Recorrido real: hacer scroll hasta el final para que carguen las imágenes lazy.
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(700);

  // Todas las imágenes tienen alt (a11y) y todos los src únicos responden 200.
  // (No se usa naturalWidth: las tarjetas del marquee fuera de vista son lazy a propósito.)
  const broken = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll("main img, section img"));
    const noAlt = imgs
      .filter((i) => !(i as HTMLImageElement).alt)
      .map((i) => (i as HTMLImageElement).src);
    const unique = [...new Set(imgs.map((i) => (i as HTMLImageElement).src))];
    const fetched = await Promise.all(
      unique.map(async (s) => (await fetch(s, { method: "HEAD" }).catch(() => null))?.ok ?? false),
    );
    return { noAlt, badSrc: unique.filter((_, i) => !fetched[i]) };
  });
  expect(broken.noAlt).toEqual([]);
  expect(broken.badSrc).toEqual([]);

  // Sin overflow horizontal a nivel de documento (el marquee se recorta en su contenedor).
  const overflow = await page.evaluate(
    () => document.scrollingElement!.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  // Los contadores del hero se animan a su valor final.
  await expect(page.getByTestId("landing-hero").locator("dd").first()).toHaveText(/\d+/);
});

test("landing v2: reveal por scroll llega al estado visible", async ({ page }) => {
  await gotoLanding(page);
  await page.locator("#servicios").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const serviciosOpacity = await page
    .locator("#servicios article")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(serviciosOpacity)).toBeGreaterThan(0.9);
});
