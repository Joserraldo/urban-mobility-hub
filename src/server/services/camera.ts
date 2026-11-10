/**
 * Cámara del vehículo (ESP32-CAM) → verificación de casco en el desbloqueo (UC09, RD7).
 *
 * La placa solo manda JPEG al servicio `umh-vision` (vision-service/), que ejecuta el modelo de cascos.
 * Aquí el API pregunta ese servicio (en localhost) por el último veredicto del vehículo. Si hay un
 * fotograma reciente, ESE veredicto manda y el resultado que declare el navegador se ignora: el cliente
 * no puede saltarse la verificación. Si no hay cámara, el flujo cae en la IA del navegador (demo),
 * salvo que se exija cámara con UMH_REQUIRE_CAMERA=1.
 */

export type CameraVerdict = { helmetDetected: boolean; confidence: number; ageMs: number };

const visionUrl = () => process.env["UMH_VISION_URL"] ?? "http://127.0.0.1:8090";

/** true si el despliegue exige que el casco lo confirme la cámara del vehículo (sin caer al navegador). */
export const cameraRequired = () => process.env["UMH_REQUIRE_CAMERA"] === "1";

/** Último veredicto reciente (≤ 5 s) de la cámara del vehículo, o null si no hay cámara o no responde. */
export async function cameraVerdict(vehicleId: string): Promise<CameraVerdict | null> {
  try {
    const res = await fetch(
      `${visionUrl()}/api/camera/latest?vehicleId=${encodeURIComponent(vehicleId)}`,
      { signal: AbortSignal.timeout(800) },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      fresh?: boolean;
      helmetDetected?: boolean;
      confidence?: number;
      ageMs?: number;
    };
    if (!j.fresh) return null;
    return {
      helmetDetected: Boolean(j.helmetDetected),
      confidence: Number(j.confidence ?? 0),
      ageMs: Number(j.ageMs ?? 0),
    };
  } catch {
    return null; // servicio caído o sin red local: se trata como "sin cámara"
  }
}

/**
 * Video en vivo (MJPEG) de la cámara del vehículo, reenviado desde umh-vision. `null` si el servicio no responde.
 * El llamador debe haber comprobado ya que el usuario puede ver ese vehículo.
 */
export async function cameraStream(
  vehicleId: string,
  signal: AbortSignal,
): Promise<Response | null> {
  try {
    const res = await fetch(
      `${visionUrl()}/api/camera/stream?vehicleId=${encodeURIComponent(vehicleId)}`,
      { signal },
    );
    return res.ok && res.body ? res : null;
  } catch {
    return null;
  }
}
