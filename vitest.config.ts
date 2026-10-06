import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Config de pruebas separada de vite.config.ts (que carga TanStack Start/Nitro y no hace falta para testear lógica).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    reporters: ["default", "json"],
    outputFile: { json: "tests/results/vitest-results.json" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      // Módulos críticos (RD7, RD8, RD13): desbloqueo, alertas IoT, tracking, reservas.
      include: ["src/server/domain/**/*.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
