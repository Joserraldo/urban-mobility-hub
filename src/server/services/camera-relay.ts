/**
 * Relay de la webcam del PC del operador hacia umh-vision (modo demo local, sin ESP32-CAM).
 *
 * (x-device-id = id del vehículo: así lo identifica umh-vision.)
 * El navegador manda el JPEG a /api/admin/camera/:vehicleId/frame (con sesión de operador) y este
 * módulo lo reenvía a umh-vision con la clave de ingesta, que NUNCA sale del servidor.
 */
import { httpError } from "./sessions";

export const CAMERA_RELAY_MAX_BYTES = 256 * 1024;
const visionUrl = () => process.env["UMH_VISION_URL"] ?? "http://127.0.0.1:8090";

export type RelayResult = { ok: number; h?: number; c?: number; n?: number };

export async function relayCameraFrame(vehicleId: string, jpeg: ArrayBuffer): Promise<RelayResult> {
  const key = process.env["INGEST_KEY"];
  if (!key || key.length < 16)
    throw httpError(
      503,
      "Falta INGEST_KEY (mínimo 16 caracteres) en el servidor para usar la cámara del PC",
    );
  if (jpeg.byteLength === 0) throw httpError(422, "El fotograma llegó vacío");
  if (jpeg.byteLength > CAMERA_RELAY_MAX_BYTES)
    throw httpError(413, "Fotograma demasiado grande (máx. 256 KB)");
  let res: Response;
  try {
    res = await fetch(`${visionUrl()}/api/camera/frame`, {
      method: "POST",
      headers: { "x-ingest-key": key, "x-device-id": vehicleId, "content-type": "image/jpeg" },
      body: jpeg,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw httpError(503, "El servicio de visión no responde (¿está corriendo en el puerto 8090?)");
  }
  const j = (await res.json().catch(() => null)) as (RelayResult & { error?: unknown }) | null;
  if (!res.ok)
    throw httpError(
      res.status === 401 ? 503 : res.status,
      `Visión rechazó el fotograma (${res.status})`,
    );
  return j ?? { ok: 1 };
}
