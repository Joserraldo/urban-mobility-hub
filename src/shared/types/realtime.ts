/**
 * Eventos de tiempo real (D3). Se entregan por WebSocket y, como respaldo, por SSE.
 * Cada evento lleva `emittedAt` (ms) para que el cliente mida la latencia (RNF-01 <=5 s, RNF-02 <1 s).
 */
import type { AlertEvent, Hub, Vehicle } from "./domain";

export type RealtimeEvent =
  | { type: "position"; vehicleId: string; lat: number; lng: number; ts: number; emittedAt: number }
  | { type: "vehicle"; vehicle: Vehicle; emittedAt: number }
  | { type: "hub"; hub: Hub; emittedAt: number }
  | { type: "alert"; alert: AlertEvent; emittedAt: number }
  /** una alerta terminó: el vehículo volvió a "ok" */
  | { type: "alert-cleared"; vehicleId: string; emittedAt: number }
  /** primer mensaje al conectar: estado completo, evita una petición REST adicional */
  | { type: "snapshot"; vehicles: Vehicle[]; hubs: Hub[]; emittedAt: number };

export type RealtimeEventType = RealtimeEvent["type"];

/** Respuesta de `GET /api/realtime/config`: cómo debe conectarse este despliegue. */
export interface RealtimeConfig {
  /** URL absoluta ws:// o wss://; null si el host no admite WebSocket (usar SSE) */
  wsUrl: string | null;
  sseUrl: string;
  /** intervalo recomendado de polling (3er nivel de respaldo), en ms */
  pollIntervalMs: number;
}
