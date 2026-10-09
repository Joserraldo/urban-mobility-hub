// Captura cada pantalla de pantallas.json y genera interfaces/README.md.
// Uso: node _tools/capturar.mjs [baseURL]   (app corriendo; por defecto http://localhost:8080)
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const base = process.argv[2] ?? "http://localhost:8080";
const root = path.resolve(import.meta.dirname, "..");
const pantallas = JSON.parse(fs.readFileSync(path.join(root, "_tools/pantallas.json"), "utf8"));
const chromeDir = path.join(os.homedir(), ".cache/puppeteer/chrome");
const exe =
  process.env.CHROME_PATH ??
  path.join(chromeDir, fs.readdirSync(chromeDir)[0], "chrome-win64/chrome.exe");
fs.mkdirSync(path.join(root, "interfaces/img"), { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
const res = [];
for (const p of pantallas) {
  const ctx = await browser.newContext({
    viewport: { width: p.vp[0], height: p.vp[1] },
    locale: "es-CO",
  });
  const page = await ctx.newPage();
  let ok = true,
    nota = "";
  try {
    if (p.login) {
      await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 30000 });
      await page.fill("#auth-email", p.login.email);
      await page.fill("#auth-password", p.login.password);
      await Promise.all([
        page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 }),
        page.click("[data-testid=auth-submit]"),
      ]);
    }
    const r = await page.goto(base + p.url, { waitUntil: "networkidle", timeout: 30000 });
    if (r && r.status() >= 400) {
      ok = false;
      nota = `HTTP ${r.status()}`;
    }
    for (const s of p.steps ?? []) {
      try {
        await page.click(s.click, { timeout: 4000 });
      } catch {
        nota += ` (no se halló ${s.click})`;
      }
    }
    await page.waitForTimeout(p.wait ?? 500);
    await page.screenshot({
      path: path.join(root, `interfaces/img/${p.id}.png`),
      fullPage: !!p.full,
    });
  } catch (e) {
    ok = false;
    nota = String(e.message).split("\n")[0];
  }
  console.log(ok ? "OK  " : "FALLO", p.id, nota);
  res.push({ ...p, ok, nota });
  await ctx.close();
}
await browser.close();
let md = `# Compilación de interfaces\n\nPantallas del sistema en el orden en que un usuario las encuentra, con captura real (Playwright sobre la app en ${base}), qué muestra, para qué sirve y el requisito que cubre. **No es un manual de usuario.**\n\nGenerado automáticamente por \`_tools/capturar.mjs\` desde \`_tools/pantallas.json\`. Para actualizar: levantar el backend (\`npm run dev:api\`), preparar la historia de datos (\`powershell -File _tools/seed-capture.ps1\`) y ejecutar \`node _tools/capturar.mjs\`.\n\n`;
res.forEach((p, i) => {
  md += `## ${i + 1}. ${p.titulo}\n\n![${p.titulo}](img/${p.id}.png)\n\n- **Ruta:** \`${p.url}\` · **Vista:** ${p.vp[0]}×${p.vp[1]}\n- **Qué muestra:** ${p.muestra}\n- **Para qué sirve:** ${p.sirve}\n- **Requisitos:** ${p.rf.join(", ")}\n${p.ok ? "" : `- **⚠ Captura no válida:** ${p.nota}\n`}\n`;
});
fs.writeFileSync(path.join(root, "interfaces/README.md"), md);
