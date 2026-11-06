import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// F-C01 (revisión de código): no arrancar en producción con secretos demo.
if (process.env["NODE_ENV"] === "production") {
  const missing = ["UMH_SESSION_SECRET", "UMH_DATA_KEY"].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Faltan secretos obligatorios en producción: ${missing.join(", ")}`);
  }
  // systemd envía SIGTERM: cerrar sin esperar a los intervalos del simulador.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => process.exit(0));
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
let apiHandlerPromise: Promise<(typeof import("./server/api/handlers"))["handle"]> | undefined;

/**
 * Backend REST en el build de producción (Node/VM). En desarrollo lo monta el
 * plugin de Vite; aquí interceptamos `/api/*` ANTES del SSR para que el mismo
 * `handle()` (SQLite + SSE) funcione también con `node .output/server/index.mjs`.
 */
async function getApiHandler(): Promise<(typeof import("./server/api/handlers"))["handle"]> {
  if (!apiHandlerPromise) {
    apiHandlerPromise = Promise.all([
      import("./server/api/handlers"),
      import("./server/services/fleet-sim"),
    ]).then(([api, sim]) => {
      sim.startSimulator();
      return api.handle;
    });
  }
  return apiHandlerPromise;
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith("/api/")) {
        const api = await getApiHandler();
        return await api(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
