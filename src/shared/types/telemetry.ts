/**
 * Mensajes IoT: lo que publica cada "Raspberry Pi" simulada (D4).
 * El MISMO payload viaja por MQTT (local) y por `POST /api/ingest` (producción).
 *
 * Topics MQTT (solo local/demo):
 *   umh/vehicle/{id}/telemetry  -> TelemetryMessage
 *   umh/vehicle/{id}/alert      -> AlertMessage   (alerta forzada, p. ej. desde el simulador)
 */
import type { ActiveAlertType } from "./domain";

export interface TelemetryMessage {
  vehicleId: string;
  /** epoch ms en que el gemelo generó la lectura (base para RNF-01 / RNF-02) */
  ts: number;
  lat: number;
  lng: number;
  /** 0-100 */
  battery: number;
  speedKmh: number;
  helmetOn: boolean;
  /** fuerza de impacto en g (acelerómetro) */
  impactG: number;
  /** milisegundos desde el último fix GPS válido */
  gpsFixAgeMs: number;
  /** true si hay un viaje activo (el casco solo se exige durante un viaje) */
  tripActive: boolean;
}

export interface AlertMessage {
  vehicleId: string;
  ts: number;
  type: ActiveAlertType;
  lat?: number;
  lng?: number;
}

/** Cuerpo de `POST /api/ingest`: telemetría o alerta forzada. */
export type IngestPayload =
  | ({ kind: "telemetry" } & TelemetryMessage)
  | ({ kind: "alert" } & AlertMessage);

export const mqttTopics = {
  telemetry: (vehicleId: string) => `umh/vehicle/${vehicleId}/telemetry`,
  alert: (vehicleId: string) => `umh/vehicle/${vehicleId}/alert`,
  /** patrón de suscripción del puente MQTT -> /api/ingest */
  allTelemetry: "umh/vehicle/+/telemetry",
  allAlerts: "umh/vehicle/+/alert",
} as const;
