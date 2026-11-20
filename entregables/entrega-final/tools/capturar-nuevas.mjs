// Capturas de las pantallas nuevas (nov-2026) sobre la app local.
// Uso: con `UMH_SEED_DEMO=1 npm run dev:api` corriendo →  node entregables/entrega-final/tools/capturar-nuevas.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "capturas-nuevas");
mkdirSync(OUT, { recursive: true });
const PASS = "Demo1234!";

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

async function as(email, fn, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, locale: "es-CO" });
  // Evita el tutorial guiado en la primera visita.
  await ctx.addInitScript(() => {
    try {
      for (const k of ["umh-tour-done", "umh_tour_done", "tour-done", "umh-onboarding"]) localStorage.setItem(k, "1");
    } catch {}
  });
  if (email) {
    const r = await ctx.request.post(`${BASE}/api/auth/login`, { data: { email, password: PASS } });
    if (!r.ok()) console.log("login falló", email, r.status());
  }
  const page = await ctx.newPage();
  try {
    await fn(page);
  } catch (e) {
    console.log("ERROR", email, e.message);
  }
  await ctx.close();
}

async function shot(page, name, full = false) {
  await page.waitForTimeout(1800);
  // Cierra diálogos de tutorial si aparecen.
  for (const t of ["Saltar", "Omitir", "Cerrar", "Entendido"]) {
    const b = page.getByRole("button", { name: t }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name), fullPage: full });
  console.log("ok", name);
}

await as("operador@demo.co", async (p) => {
  await p.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await shot(p, "n01-admin-monitoreo.png");
  const tabs = p.locator('[data-testid="admin-tabs"] [role="tab"]');
  const n = await tabs.count();
  for (let i = 1; i < n; i++) {
    const label = (await tabs.nth(i).innerText()).trim();
    await tabs.nth(i).click();
    const slug = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-");
    await p.locator('[data-testid="admin-tabs"]').scrollIntoViewIfNeeded();
    await p.evaluate(() => window.scrollBy(0, -120));
    await shot(p, `n0${i + 1}-admin-${slug}.png`);
  }
  await p.goto(`${BASE}/admin/qr`, { waitUntil: "networkidle" });
  await shot(p, "n10-admin-qr.png");
});

await as("viajero@demo.co", async (p) => {
  await p.goto(`${BASE}/mis-reservas`, { waitUntil: "networkidle" });
  await shot(p, "n11-mis-reservas.png");
  await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await shot(p, "n12-app-viaje-activo.png");
});

await as("cliente@demo.co", async (p) => {
  await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await shot(p, "n13-app-cliente-mapa.png");
});

await as("domi1@demo.co", async (p) => {
  await p.goto(`${BASE}/entregas`, { waitUntil: "networkidle" });
  await shot(p, "n14-entregas-domiciliario.png");
});

await as(
  "cliente@demo.co",
  async (p) => {
    await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await shot(p, "n15-movil-app.png");
    await p.goto(`${BASE}/mis-reservas`, { waitUntil: "networkidle" });
    await shot(p, "n16-movil-mis-reservas.png");
  },
  { width: 390, height: 844 },
);

await browser.close();
