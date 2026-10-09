// Tipos de dominio que consume el frontend. Son el espejo de src/shared/types (dueño: backend, D1).
// Si el contrato real cambia un nombre, solo se ajusta el adaptador (api.ts), nunca los componentes.

export type VehicleKind = "scooter" | "bike" | "drone";
export type VehicleMode = "rent" | "sale";
export type AlertType = "ok" | "no-helmet" | "crash" | "gps-lost" | "low-battery";
export type ActiveAlertType = Exclude<AlertType, "ok">;
export type ReservationStatus = "requested" | "active" | "completed" | "cancelled";
export type RentalModality = "hub" | "delivery";
export type UserRole = "user" | "operator" | "courier";
export type VehicleStatus = "available" | "reserved" | "in_use" | "sold" | "offline";

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
