// RF-08 / RNF-01 · riesgo RD6 (latencia). R-20 del SRS: se mide renderedAt - generatedAt.

export const POSITION_MAX_AGE_MS = 5000;

/** Una posición cumple frescura si no supera la edad máxima permitida. */
export function isPositionFresh(
  generatedAt: number,
  renderedAt: number,
  maxAgeMs = POSITION_MAX_AGE_MS,
): boolean {
  return renderedAt - generatedAt <= maxAgeMs;
}
