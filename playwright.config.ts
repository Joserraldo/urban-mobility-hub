import { defineConfig, devices } from "@playwright/test";

// BASE_URL permite correr los mismos tests contra la URL pública (smoke post-despliegue).
const baseURL = process.env.BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/results/e2e-artifacts",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "tests/results/playwright-results.json" }]],
  use: { baseURL, screenshot: "on", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
