// Tipos de dominio que consume el frontend. Son el espejo de src/shared/types (dueño: backend, D1).
// Si el contrato real cambia un nombre, solo se ajusta el adaptador (api.ts), nunca los componentes.

export type VehicleKind = "scooter" | "bike" | "drone";
export type VehicleMode = "rent" | "sale";
export type AlertType = "ok" | "no-helmet" | "crash" | "gps-lost" | "low-battery";
export type ActiveAlertType = Exclude<AlertType, "ok">;
export type ReservationStatus = "requested" | "active" | "completed" | "cancelled";
export type RentalModality = "hub" | "delivery";
export type UserRole = "user" | "operator" | "courier";
export type VehicleStatus =
  "available" | "reserved" | "in_use" | "sold" | "offline" | "maintenance";

export type Hub = {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  charging: number;
  active: boolean;
};

export type Vehicle = {
  id: string;
  kind: VehicleKind;
  model: string;
  mode: VehicleMode;
  battery: number;
  pricePerMinute?: number | undefined;
  price?: number | undefined;
  condition?: "nuevo" | "seminuevo" | undefined;
  spec: string;
  hubId?: string | undefined;
  lat: number;
  lng: number;
  alert: AlertType;
  delivery?: boolean | undefined;
  /** estado comercial/operativo (contrato `domain.ts`); el mock lo asume 'available' */
  status?: VehicleStatus | undefined;
  qrCode?: string | undefined;
  /** velocidad en vivo (km/h) llegada por SSE; solo vehículos en viaje */
  speedKmh?: number | undefined;
};

export type AlertEvent = {
  id: string;
  vehicleId: string;
  type: ActiveAlertType;
  lat: number;
  lng: number;
  ts: number;
};

export type Reservation = {
  id: string;
  vehicleId: string;
  userId: string;
  modality: RentalModality;
  /** dirección de entrega, solo modality = "delivery" */
  address?: string | undefined;
  status: ReservationStatus;
  createdAt: number;
  startedAt?: number | undefined;
  endedAt?: number | undefined;
  totalCost?: number | undefined;
  /** referencia de la pasarela al pagar (UC18); ausente en el mock */
  paymentRef?: string | undefined;
  /** ¿El prepago ya está aprobado? Solo una reserva pagada se puede desbloquear. */
  paid?: boolean | undefined;
};

export type Purchase = {
  id: string;
  vehicleId: string;
  userId: string;
  price: number;
  createdAt: number;
  paymentRef?: string | undefined;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  consentAt: number;
  faceEnrolled: boolean;
};

export type UnlockStep = "qr" | "helmet" | "ready" | "denied" | "expired";

export type UnlockSession = {
  id: string;
  vehicleId: string;
  step: UnlockStep;
  reason?: string | undefined;
  expiresAt: number;
  /** quién decidió el casco: la cámara del vehículo (ESP32-CAM) o la IA del navegador */
  helmetSource?: "camera" | "client" | undefined;
};

/** Estado de la cámara de casco montada en un vehículo. */
export type VehicleCameraStatus = {
  online: boolean;
  required: boolean;
  /** último veredicto de la cámara (solo si está en línea) */
  helmetDetected?: boolean | undefined;
  confidence?: number | undefined;
};

export type FleetEvent =
  | {
      type: "position";
      vehicleId: string;
      lat: number;
      lng: number;
      ts: number;
      /** telemetría en vivo (solo viajes simulados/reales en curso) */
      battery?: number | undefined;
      speedKmh?: number | undefined;
    }
  | { type: "vehicle"; vehicle: Vehicle }
  | { type: "alert"; alert: AlertEvent };

export type Unsubscribe = () => void;

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  consent: boolean;
  /** Consentimiento biométrico separado y opcional (RF-20, RF-22). */
  biometric?: boolean;
};
export type LoginInput = { email: string; password: string };
export type ReservationInput = {
  vehicleId: string;
  modality: RentalModality;
  address?: string;
};

export class DataError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_found"
      | "unauthorized"
      | "forbidden"
      | "validation"
      | "conflict"
      | "network"
      | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "DataError";
  }
}

/** Veredicto que devuelve umh-vision al recibir un fotograma de la webcam del PC. */
export type PcCameraVerdict = { helmetDetected: boolean; confidence: number };

/** Orden de mantenimiento de un vehículo (abierta mientras `closedAt` es undefined). */
export type MaintenanceOrder = {
  id: string;
  vehicleId: string;
  vehicleModel: string;
  vehicleKind: VehicleKind;
  reason: string;
  notes: string;
  openedAt: number;
  openedBy: string;
  closedAt?: number | undefined;
  closedBy?: string | undefined;
  resolution?: string | undefined;
};
export type MaintenanceList = { open: MaintenanceOrder[]; closed: MaintenanceOrder[] };

/** Una lectura del historial de telemetría (máx. 1 cada ~10 s por vehículo). */
export type TelemetrySample = {
  ts: number;
  lat: number;
  lng: number;
  battery: number;
  speedKmh: number;
  helmetOn: boolean;
  impactG: number;
  alert: string;
};
