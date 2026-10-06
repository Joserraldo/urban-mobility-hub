// RF-11, RF-12, RF-15, RNF-02, RNF-04 · riesgo RD8 (fallo del trigger de seguridad).

export const ALERT_THRESHOLDS = {
  criticalBattery: 15,
  impactG: 3,
  gpsLostMs: 10000,
} as const;

export type TelemetryAlert = "ok" | "no-helmet" | "crash" | "gps-lost" | "low-battery";

export type Telemetry = {
  vehicleId: string;
  ts: number;
  lat: number;
  lng: number;
  battery: number;
  speedKmh: number;
  helmetOn: boolean;
  impactG: number;
  gpsFixAgeMs: number;
  tripActive: boolean;
};

/**
 * Evalúa una muestra de telemetría y devuelve la alerta de mayor prioridad.
 * Orden (R-07 del SRS): crash > no-helmet > gps-lost > low-battery > ok.
 */
export function evaluateTelemetry(t: Telemetry): TelemetryAlert {
  if (t.impactG >= ALERT_THRESHOLDS.impactG) return "crash";
  if (t.tripActive && !t.helmetOn) return "no-helmet";
  if (t.gpsFixAgeMs >= ALERT_THRESHOLDS.gpsLostMs) return "gps-lost";
  if (t.battery <= ALERT_THRESHOLDS.criticalBattery) return "low-battery";
  return "ok";
}
