// RF-09, RF-10 · riesgo RD7 (falsos positivos/negativos), RD8.
// Máquina de estados del desbloqueo: qr -> helmet -> ready, con rechazos y caducidad.

export const UNLOCK_TTL_MS = 120_000;
export const HELMET_MIN_CONFIDENCE = 0.8;
export const FACE_MIN_SIMILARITY = 0.85;

export type UnlockStep = "qr" | "helmet" | "ready" | "denied" | "expired";

export type UnlockSession = {
  id: string;
  vehicleId: string;
  step: UnlockStep;
  expiresAt: number;
  reason?: string;
};

export type HelmetResult = { helmetDetected: boolean; confidence: number };
export type FaceResult = { score: number; registered: boolean; consent: boolean };

export class UnlockOrderError extends Error {
  constructor(message = "Orden de pasos inválido") {
    super(message);
    this.name = "UnlockOrderError";
  }
}

let counter = 0;

export function createUnlockSession(
  vehicleId: string,
  now: number = Date.now(),
  ttlMs = UNLOCK_TTL_MS,
): UnlockSession {
  counter += 1;
  return { id: `UL-${vehicleId}-${now}-${counter}`, vehicleId, step: "qr", expiresAt: now + ttlMs };
}

const isExpired = (session: UnlockSession, now: number) => now > session.expiresAt;

export function scanQr(session: UnlockSession, code: string, now: number): UnlockSession {
  if (isExpired(session, now)) return { ...session, step: "expired" };
  if (code.trim() === `UMH:${session.vehicleId}`) return { ...session, step: "helmet" };
  return { ...session, step: "denied", reason: "El código QR no corresponde a este vehículo" };
}

export function verifyHelmet(
  session: UnlockSession,
  result: HelmetResult,
  now: number,
): UnlockSession {
  if (session.step !== "helmet") throw new UnlockOrderError("Primero escanea el código QR");
  if (isExpired(session, now)) return { ...session, step: "expired" };
  if (result.helmetDetected && result.confidence >= HELMET_MIN_CONFIDENCE) {
    return { ...session, step: "ready" };
  }
  return {
    ...session,
    step: "denied",
    reason: "No se detectó el casco con suficiente confianza",
  };
}

export function verifyFace(session: UnlockSession, result: FaceResult, now: number): UnlockSession {
  if (session.step !== "qr") throw new UnlockOrderError("Orden de pasos inválido");
  if (isExpired(session, now)) return { ...session, step: "expired" };
  if (result.registered && result.consent && result.score >= FACE_MIN_SIMILARITY) {
    return { ...session, step: "helmet" };
  }
  return { ...session, step: "denied", reason: "No reconocimos tu rostro" };
}

/** Solo se puede iniciar el viaje con el casco verificado (paso ready) y la sesión vigente. */
export function canStartTrip(session: UnlockSession, now: number): boolean {
  return session.step === "ready" && !isExpired(session, now);
}
