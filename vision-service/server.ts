/**
 * umh-vision: servicio independiente que recibe los JPEG del ESP32-CAM, ejecuta el modelo de cascos y guarda el
 * último veredicto por vehículo. Corre AL LADO de la app de producción (que no se toca) y comparte solo su base
 * SQLite en modo lectura para validar vehículos y saber si hay un desbloqueo esperando el casco.
 *
 *   POST /api/camera/frame   (público vía nginx)  x-ingest-key + x-device-id, cuerpo = JPEG crudo
 *   GET  /api/camera/latest  (solo local)         ?vehicleId=… → { fresh, helmetDetected, confidence, ageMs }
 *   GET  /api/camera/health
 */
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { OnnxHelmetDetector } from "../src/server/adapters/vision/onnx-helmet";
import type { HelmetDetector, HelmetVerdict } from "../src/server/ports/vision";

const env = process.env;
const PORT = Number(env["PORT"] ?? 8090);
const HOST = env["HOST"] ?? "127.0.0.1";
const INGEST_KEY = env["INGEST_KEY"] ?? "";
const DB_PATH = env["UMH_DB_PATH"] ?? "/var/lib/umh/umh.db";
const MODEL = env["HELMET_MODEL_PATH"] ?? "models/helmet.onnx";
const LABELS = env["HELMET_LABELS_PATH"] ?? "models/helmet.labels.json";
const THREADS = Number(env["VISION_THREADS"] ?? 2);
const FRESH_MS = Number(env["CAMERA_FRESH_MS"] ?? 5000);
const FAST_MS = 300;
const IDLE_MS = 2000;
const MAX_JPEG = 262_144;

if (!INGEST_KEY || INGEST_KEY.length < 16) {
  console.error("[vision] INGEST_KEY obligatoria (mínimo 16 caracteres)");
  process.exit(1);
}

const keyOk = (given: string | undefined): boolean => {
  if (!given || given.length !== INGEST_KEY.length) return false;
  let d = 0;
  for (let i = 0; i < given.length; i++) d |= given.charCodeAt(i) ^ INGEST_KEY.charCodeAt(i);
  return d === 0;
};

// ---- Base de la app (solo lectura) ----
let db: DatabaseSync | undefined;
try {
  db = new DatabaseSync(DB_PATH, { readOnly: true });
} catch (e) {
  console.error(
    "[vision] no se pudo abrir la BD de la app; se aceptará cualquier id de vehículo",
    e,
  );
}
const knownCache = new Map<string, number>();
const waitCache = new Map<string, { until: number; waiting: boolean }>();

function vehicleKnown(id: string): boolean {
  if (!db) return /^[A-Za-z0-9-]{1,40}$/.test(id);
  const now = Date.now();
  if ((knownCache.get(id) ?? 0) > now) return true;
  const ok = !!db.prepare("SELECT 1 FROM vehicles WHERE id = ?").get(id);
  if (ok) knownCache.set(id, now + 30_000);
  return ok;
}
function waitingForHelmet(id: string): boolean {
  if (!db) return false;
  const now = Date.now();
  const hit = waitCache.get(id);
  if (hit && hit.until > now) return hit.waiting;
  let waiting = false;
  try {
    waiting = !!db
      .prepare(
        "SELECT 1 FROM unlock_sessions WHERE vehicle_id = ? AND step = 'helmet' AND expires_at > ?",
      )
      .get(id, now);
  } catch {
    /* esquema distinto: se queda en ritmo lento */
  }
  waitCache.set(id, { until: now + 1000, waiting });
  return waiting;
}

// ---- Modelo ----
const detector: HelmetDetector = await OnnxHelmetDetector.load(MODEL, LABELS, THREADS);
console.log("[vision] modelo cargado");

type Latest = HelmetVerdict & { ts: number };
const latest = new Map<string, Latest>();
// Último JPEG recibido por vehículo (para el streaming a la pantalla) y análisis en segundo plano:
// la placa recibe respuesta al instante y la inferencia (~0,6 s) no limita sus fotogramas por segundo.
const frames = new Map<string, { jpeg: Buffer; seq: number }>();
let analyzing = false;
let seqCounter = 0;

async function analyzeLatest(id: string): Promise<void> {
  if (analyzing) return; // un solo análisis a la vez; el siguiente fotograma que llegue lo relanza
  const f = frames.get(id);
  if (!f) return;
  analyzing = true;
  try {
    const v = await detector.detect(f.jpeg);
    latest.set(id, { ...v, ts: Date.now() });
  } catch {
    /* imagen corrupta: se ignora, llegará otra */
  } finally {
    analyzing = false;
  }
}

function readBody(req: import("node:http").IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let n = 0;
    req.on("data", (c: Buffer) => {
      n += c.length;
      if (n > MAX_JPEG) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", () => resolve(null));
  });
}

const send = (res: import("node:http").ServerResponse, status: number, body: unknown) => {
  const s = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(s),
  });
  res.end(s);
};
const err = (
  res: import("node:http").ServerResponse,
  status: number,
  code: string,
  message: string,
) => send(res, status, { error: { code, message } });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  try {
    if (req.method === "GET" && url.pathname === "/api/camera/health")
      return send(res, 200, { status: "ok", model: true });

    if (req.method === "GET" && url.pathname === "/api/camera/latest") {
      // Solo para la app (localhost). Lo que llega por nginx trae x-forwarded-for / x-real-ip → se rechaza.
      if (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])
        return err(res, 403, "FORBIDDEN", "Solo acceso local");
      const v = latest.get(url.searchParams.get("vehicleId") ?? "");
      const age = v ? Date.now() - v.ts : null;
      return send(
        res,
        200,
        v && age !== null && age <= FRESH_MS
          ? { fresh: true, helmetDetected: v.helmetDetected, confidence: v.confidence, ageMs: age }
          : { fresh: false },
      );
    }

    // Video en vivo (MJPEG) de la cámara del vehículo. Solo local: la app lo reenvía a usuarios autorizados.
    if (req.method === "GET" && url.pathname === "/api/camera/stream") {
      if (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])
        return err(res, 403, "FORBIDDEN", "Solo acceso local");
      const id = url.searchParams.get("vehicleId") ?? "";
      res.writeHead(200, {
        "content-type": "multipart/x-mixed-replace; boundary=frame",
        "cache-control": "no-store",
        connection: "keep-alive",
      });
      let last = -1;
      let lastWrite = Date.now();
      const timer = setInterval(() => {
        const f = frames.get(id);
        if (!f || f.seq === last) {
          if (Date.now() - lastWrite > 30_000) res.end(); // sin imagen en 30 s: cerrar
          return;
        }
        if (res.writableNeedDrain) return; // cliente lento: saltar fotograma, no acumular
        last = f.seq;
        lastWrite = Date.now();
        res.write(
          `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${f.jpeg.length}\r\n\r\n`,
        );
        res.write(f.jpeg);
        res.write("\r\n");
      }, 100);
      req.on("close", () => clearInterval(timer));
      res.on("close", () => clearInterval(timer));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/camera/frame") {
      if (!keyOk(req.headers["x-ingest-key"] as string | undefined))
        return err(res, 401, "UNAUTHENTICATED", "Clave de dispositivo inválida");
      const id = String(req.headers["x-device-id"] ?? "");
      if (!id || id.length > 40)
        return err(res, 400, "VALIDATION_ERROR", "Falta la cabecera x-device-id");
      const jpeg = await readBody(req);
      if (!jpeg) return err(res, 413, "VALIDATION_ERROR", "Fotograma demasiado grande");
      if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8)
        return err(res, 400, "VALIDATION_ERROR", "El cuerpo debe ser una imagen JPEG");
      if (!vehicleKnown(id)) return err(res, 404, "NOT_FOUND", "Vehículo no encontrado");

      frames.set(id, { jpeg, seq: ++seqCounter });
      void analyzeLatest(id);
      const base = waitingForHelmet(id) ? FAST_MS : IDLE_MS;
      const l = latest.get(id);
      return send(res, 200, {
        ok: 1,
        h: l?.helmetDetected ? 1 : 0,
        c: Math.round((l?.confidence ?? 0) * 100),
        n: base,
      });
    }

    return err(res, 404, "NOT_FOUND", "Ruta no encontrada");
  } catch (e) {
    console.error("[vision] error", e);
    if (!res.headersSent) err(res, 500, "INTERNAL_ERROR", "Error interno");
  }
});

server.keepAliveTimeout = 65_000; // la placa reutiliza la conexión; no cerrarla en reposo (2 s)
server.listen(PORT, HOST, () => console.log(`[vision] escuchando en ${HOST}:${PORT}`));
