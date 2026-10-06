// Tipos de dominio que consume el frontend. Son el espejo de src/shared/types (dueño: backend, D1).
// Si el contrato real cambia un nombre, solo se ajusta el adaptador (api.ts), nunca los componentes.

export type VehicleKind = "scooter" | "bike" | "drone";
export type VehicleMode = "rent" | "sale";
export type AlertType = "ok" | "no-helmet" | "crash" | "gps-lost" | "low-battery";
export type ActiveAlertType = Exclude<AlertType, "ok">;
export type ReservationStatus = "requested" | "active" | "completed" | "cancelled";
export type RentalModality = "hub" | "delivery";
export type UserRole = "user" | "operator";

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
  pricePerMinute?: number;
  price?: number;
  condition?: "nuevo" | "seminuevo";
  spec: string;
  hubId?: string;
  lat: number;
  lng: number;
  alert: AlertType;
  delivery?: boolean;
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
  address?: string;
  status: ReservationStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  totalCost?: number;
};

export type Purchase = {
  id: string;
  vehicleId: string;
  userId: string;
  price: number;
  createdAt: number;
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
  reason?: string;
  expiresAt: number;
};

export type FleetEvent =
  | { type: "position"; vehicleId: string; lat: number; lng: number; ts: number }
  | { type: "vehicle"; vehicle: Vehicle }
  | { type: "alert"; alert: AlertEvent };

export type Unsubscribe = () => void;

export type RegisterInput = { name: string; email: string; password: string; consent: boolean };
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
