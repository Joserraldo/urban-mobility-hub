// Genera los dos PDF de la entrega final (análisis y diseño OO + pantallazos).
// Uso (desde la raíz del repo):
//   CHROME_PATH="C:/Users/<usuario>/AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe" node entregables/entrega-final/tools/build.mjs
// Requiere: node_modules del repo (@playwright/test, sharp) y `npm i` en esta carpeta (pdf-lib).
import { chromium } from "@playwright/test";
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFString, PDFHexString } from "pdf-lib";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, OUT, HTML_DIR } from "./lib.mjs";
import { buildAnalisis } from "./content-analisis.mjs";
import { buildPantallazos } from "./content-pantallazos.mjs";

const FOOTER = (title) => `
<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:7.5px;color:#64748b;width:100%;padding:0 15mm;display:flex;justify-content:space-between;align-items:center">
  <span>Urban Mobility Hub · ${title}</span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
</div>`;
const HEADER = `
<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:7.5px;color:#94a3b8;width:100%;padding:0 15mm;display:flex;justify-content:space-between">
  <span>Ingeniería de Software II · UNAB</span><span>20 de noviembre de 2026</span>
</div>`;

/** Mapa id-de-ancla → número de página (1-based) leyendo los destinos del PDF de Chromium. */
async function anchorPages(pdfBytes) {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  const refToIndex = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  const map = new Map();
  const decode = (o) =>
    o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : o?.toString?.().replace(/^\//, "");
  const destPage = (arr) => (arr instanceof PDFArray ? refToIndex.get(arr.get(0)?.toString()) : undefined);
  const ctx = doc.context;
  // 1) Árbol /Names /Dests
  const names = doc.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  const walk = (node) => {
    if (!node) return;
    const kids = node.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (kids) for (let i = 0; i < kids.size(); i++) walk(kids.lookup(i, PDFDict));
    const arr = node.lookupMaybe(PDFName.of("Names"), PDFArray);
    if (arr)
      for (let i = 0; i + 1 < arr.size(); i += 2) {
        let v = arr.lookup(i + 1);
        if (v instanceof PDFDict) v = v.lookup(PDFName.of("D"));
        const pg = destPage(v);
        if (pg) map.set(decodeURIComponent(decode(arr.lookup(i))), pg);
      }
  };
  if (names) walk(names.lookupMaybe(PDFName.of("Dests"), PDFDict));
  // 2) Diccionario /Dests del catálogo
  const dests = doc.catalog.lookupMaybe(PDFName.of("Dests"), PDFDict);
  if (dests)
    for (const [k, v] of dests.entries()) {
      const pg = destPage(ctx.lookup(v));
      if (pg) map.set(decodeURIComponent(k.toString().slice(1)), pg);
    }
  return { map, total: pages.length };
}

async function render(browser, name, html, title) {
  const htmlPath = path.join(HTML_DIR, `${name}.html`);
  const pdfPath = path.join(OUT, `${name}.pdf`);
  const page = await browser.newPage();
  const opts = {
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: HEADER,
    footerTemplate: FOOTER(title),
    margin: { top: "16mm", bottom: "16mm", left: "0", right: "0" },
    preferCSSPageSize: true,
    outline: true,
    tagged: true,
  };
  const pass = async (src) => {
    writeFileSync(htmlPath, src, "utf8");
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const broken = await page.evaluate(() =>
      [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")),
    );
    if (broken.length) console.warn("  ⚠ imágenes que no cargan:", broken);
    return page.pdf(opts);
  };
  // Pasada 1: sin números → leer en qué página cae cada ancla. Pasada 2: con números.
  let bytes = await pass(html);
  const { map } = await anchorPages(bytes);
  const withNums = html.replace(/<span class="pg" data-for="([^"]+)"><\/span>/g, (_, id) =>
    `<span class="pg" data-for="${id}">${map.get(id) ?? ""}</span>`,
  );
  bytes = await pass(withNums);
  const check = await anchorPages(bytes);
  const missing = [...withNums.matchAll(/data-for="([^"]+)"/g)].map((m) => m[1]).filter((id) => !check.map.has(id));
  writeFileSync(pdfPath, bytes);
  await page.close();
  console.log(
    `✔ ${path.relative(ROOT, pdfPath)} — ${check.total} páginas, ${check.map.size} destinos` +
      (missing.length ? `, sin destino: ${missing.join(", ")}` : ""),
  );
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
await render(browser, "Entrega_Analisis_Diseno_OO_UrbanMobilityHub", await buildAnalisis(), "Análisis y diseño orientado a objetos");
await render(browser, "Entrega_Pantallazos_UrbanMobilityHub", await buildPantallazos(), "Pantallazos del software");
await browser.close();
