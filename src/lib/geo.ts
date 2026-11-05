// Utilidades geográficas del mapa: distancia, vehículo más cercano y nivel de batería.
// Funciones puras para poder probarlas sin navegador.

export type LatLng = { lat: number; lng: number };

/** Centro por defecto del mapa (Bucaramanga). */
export const CITY_CENTER: LatLng = { lat: 7.1139, lng: -73.1098 };

/** Radio de cobertura que se dibuja alrededor de cada hub, en metros. */
export const HUB_COVERAGE_M = 700;

/** Velocidad media caminando (~4,8 km/h) para estimar minutos a pie. */
const WALK_M_PER_MIN = 80;

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Minutos caminando, redondeados hacia arriba (mínimo 1). */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / WALK_M_PER_MIN));
}

/** "350 m" o "1,2 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Elemento más cercano a `from` entre los candidatos, con su distancia. */
export function nearest<T extends LatLng>(
  from: LatLng,
  items: T[],
): { item: T; meters: number } | null {
  let best: { item: T; meters: number } | null = null;
  for (const item of items) {
    const meters = distanceM(from, item);
    if (!best || meters < best.meters) best = { item, meters };
  }
  return best;
}

export type BatteryLevel = "high" | "mid" | "low";

/** Alta ≥ 50 %, media 20–49 %, baja < 20 %. */
export function batteryLevel(pct: number): BatteryLevel {
  if (pct >= 50) return "high";
  if (pct >= 20) return "mid";
  return "low";
}
