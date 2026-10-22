// Genera el PDF desde investigacion.html con el Chromium de puppeteer.
// Uso: node entregables/investigacion/build-pdf.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = import.meta.dirname;
const chromeDir = path.join(os.homedir(), ".cache/puppeteer/chrome");
const exe =
  process.env.CHROMIUM_PATH ||
  path.join(chromeDir, fs.readdirSync(chromeDir)[0], "chrome-win64/chrome.exe");
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
await page.goto("file:///" + path.join(dir, "investigacion.html").replaceAll("\\", "/"));
await page.pdf({
  path: path.join(dir, "Investigacion-UML-paquetes-componentes-nodos.pdf"),
  format: "A4",
  printBackground: true,
});
await browser.close();
console.log("OK");
