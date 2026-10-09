import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

/**
 * Sirve los assets del runtime ONNX (public/ort) en dev. Vite dev responde 500 a
 * `import("/ort/*.mjs?import")` (trata los assets de public/ como módulos a transformar);
 * en producción el servidor estático no falla. Este middleware limpia el sufijo `?import`
 * para que el cargador WASM de onnxruntime-web funcione también en dev (RD7).
 */
export function umhOrtPlugin(): Plugin {
  return {
    name: "umh-ort-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url.startsWith("/ort/") && url.endsWith("?import"))
          req.url = url.replace("?import", "");
        next();
      });
    },
  };
}

/**
 * Backend de DESARROLLO: middleware que monta el REST real (`/api/*` + SSE) sobre
 * Vite, con SQLite (node:sqlite). Los diagramas de secuencia describen estas rutas
 * y tablas literalmente. En producción el mismo schema.sql corre en D1 y las rutas
 * se replican como server routes de Nitro (pendiente, ver entregables/gcs/despliegue.md).
 *
 * Los imports del servidor son dinámicos a propósito: el config de Vite se empaqueta
 * antes que el pipeline de plugins y no soporta `?raw`.
 */
export function umhApiPlugin(): Plugin {
  return {
    name: "umh-dev-api",
    // pre: el SSR de TanStack Start monta un catch-all; este middleware debe ir antes
    // para que /api/* no termine renderizado como página.
    enforce: "pre",
    async configureServer(server) {
      const [{ handle }, { startSimulator, stopSimulator }] = await Promise.all([
        import("./api/handlers"),
        import("./services/fleet-sim"),
      ]);
      startSimulator();
      server.httpServer?.on("close", stopSimulator);

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const request = await toRequest(req);
          const response = await handle(request);

          if ((response.headers.get("content-type") ?? "").includes("text/event-stream")) {
            res.writeHead(response.status, Object.fromEntries(response.headers));
            res.flushHeaders();
            const reader = response.body?.getReader();
            if (!reader) return res.end();
            const pump = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
              } catch {
                /* cliente desconectado */
              }
            };
            req.on("close", () => void reader.cancel());
            void pump();
            return;
          }

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  };
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost:8080";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    for (const v of Array.isArray(value) ? value : [value]) headers.append(key, v);
  }
  const method = (req.method ?? "GET").toUpperCase();
  const chunks: Buffer[] = [];
  if (!["GET", "HEAD"].includes(method)) {
    for await (const chunk of req) chunks.push(chunk as Buffer);
  }
  const init: RequestInit = { method, headers };
  if (chunks.length) init.body = Buffer.concat(chunks);
  return new Request(`http://${host}${req.url}`, init);
}
