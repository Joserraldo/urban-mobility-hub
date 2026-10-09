import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// BASE_URL permite correr los mismos tests contra la URL pública (smoke post-despliegue).
const baseURL = process.env.BASE_URL ?? "http://localhost:8080";

// Reusa el Chromium que ya descargó puppeteer (entorno del equipo sin browsers de Playwright);
// en CI con `playwright install` basta con no definir CHROMIUM_PATH.
const chromeDir = path.join(os.homedir(), ".cache/puppeteer/chrome");
const chromiumPath =
  process.env.CHROMIUM_PATH ??
  (fs.existsSync(chromeDir)
    ? path.join(chromeDir, fs.readdirSync(chromeDir)[0], "chrome-win64/chrome.exe")
    : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/results/e2e-artifacts",
  // La app es pesada (imágenes reales + runtime WASM de la IA): con workers en
  // paralelo el dev server local se satura y los tests estallan por timeout.
  timeout: 45_000,
  workers: process.env.CI ? undefined : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "tests/results/playwright-results.json" }]],
  use: {
    baseURL,
    screenshot: "on",
    trace: "retain-on-failure",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        // e2e corre contra el backend real (SQLite + Brevo simulated): mismo camino que la demo.
        command: "npm run dev:api",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
