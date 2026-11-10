import jsQR from "jsqr";

/** Decodifica un QR de un fotograma RGBA (ImageData). `null` si no hay ninguno legible. Funciona en cualquier navegador. */
export function decodeQr(data: Uint8ClampedArray, width: number, height: number): string | null {
  const hit = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return hit?.data ? hit.data : null;
}

/** Normaliza lo leído: sin espacios ni saltos de línea (un QR impreso o pegado a mano suele traerlos). */
export const normalizeQr = (raw: string) => raw.trim();
