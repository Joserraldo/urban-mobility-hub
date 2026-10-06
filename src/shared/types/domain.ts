/**
 * Tipos de DOMINIO compartidos entre backend y frontend (D1: contrato-first, RD5/RNF-10).
 * Dueño: backend. El frontend los consume; nunca debe importar nada de `src/server`.
 *
 * Convenciones del contrato (se repiten en docs/api/openapi.yaml):
 *  - Todas las marcas de tiempo son milisegundos desde epoch (number) -> `ts`, `createdAt`...
 *  - Coordenadas GPS planas: `lat` / `lng` (grados decimales, WGS84).
 *  - Dinero en pesos colombianos (COP) como entero.
 *  - Identificadores: string con prefijo legible (HUB-01, SC-1042, RES-..., USR-...).
 */

export type VehicleKind = "scooter" | "bike" | "drone";
export type VehicleMode = "rent" | "sale";

/** Los 4 eventos de seguridad IoT del SRS (RF-11) más "ok" (sin novedad). */
export type AlertType = "ok" | "no-helmet" | "crash" | "gps-lost" | "low-battery";
export type ActiveAlertType = Exclude<AlertType, "ok">;
export const ACTIVE_ALERT_TYPES: readonly ActiveAlertType[] = [
  "no-helmet",
  "crash",
  "gps-lost",
  "low-battery",
] as const;

export type ReservationStatus = "requested" | "active" | "completed" | "cancelled";
export type RentalModality = "hub" | "delivery";
export type UserRole = "user" | "operator";
export type VehicleCondition = "nuevo" | "seminuevo";

/** Hub: punto físico de recolección/entrega y carga (RF-06, RF-07). */
export interface Hub {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  charging: number;
  active: boolean;
}

/** Gemelo digital de un vehículo (RF-14, RF-16). Mismo modelo para mapa y panel (RF-17). */
export interface Vehicle {
  id: string;
  kind: VehicleKind;
  model: string;
  mode: VehicleMode;
  /** 0-100 */
  battery: number;
  /** COP por minuto; solo mode = "rent" */
  pricePerMinute?: number;
  /** COP; solo mode = "sale" */
  price?: number;
  condition?: VehicleCondition;
  spec: string;
  hubId?: string;
  lat: number;
  lng: number;
  alert: AlertType;
  /** apto para entrega a domicilio (RF-05) */
  delivery?: boolean;
  /**
   * Código impreso en el vehículo (formato `UMH:<id>`). Es lo que "lee" el escáner QR (RF-09).
   * No es un secreto: el control real es la sesión de desbloqueo + casco.
   */
  qrCode: string;
  /** Disponibilidad comercial/operativa. Un vehículo "sold" o "in-use" no se puede reservar/comprar. */
  status: VehicleStatus;
}

export type VehicleStatus = "available" | "reserved" | "in-use" | "sold" | "offline";

/** Entrada de la bitácora auditable de alertas (RF-12, RNF-04). */
export interface AlertEvent {
  id: string;
  vehicleId: string;
  type: ActiveAlertType;
  lat: number;
  lng: number;
  ts: number;
  /** Origen del evento: sensor real/simulado (ingest/MQTT) o botón del simulador del operador (RF-15). */
  source: "telemetry" | "simulator";
}

export interface Reservation {
  id: string;
  vehicleId: string;
  userId: string;
  modality: RentalModality;
  /** dirección de entrega, solo modality = "delivery" */
  address?: string;
  status: ReservationStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  /** COP, calculado al completar: ceil(minutos) * pricePerMinute */
  totalCost?: number;
}

export type PaymentMethod = "card" | "pse" | "cash";

export interface Purchase {
  id: string;
  vehicleId: string;
  userId: string;
  /** COP */
  price: number;
  paymentMethod: PaymentMethod;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Momento en que aceptó el tratamiento de datos personales (Ley 1581). */
  consentAt: number;
  /** true si tiene plantilla facial cifrada guardada (RF-10, RNF-03). */
  faceEnrolled: boolean;
}

/** Pasos del desbloqueo (RF-09). `ready` = se puede pulsar "Iniciar viaje". */
export type UnlockStep = "qr" | "helmet" | "ready" | "denied" | "expired";

export interface UnlockSession {
  id: string;
  vehicleId: string;
  reservationId: string;
  step: UnlockStep;
  /** motivo legible cuando step = "denied" */
  reason?: string;
  /** epoch ms; pasado este instante la sesión expira (TTL 120 s) */
  expiresAt: number;
}

/** Indicadores agregados del panel (RF-13). */
export interface FleetKpis {
  connectedVehicles: number;
  activeHubs: number;
  /** promedio redondeado de batería de la flota en alquiler */
  averageBattery: number;
  activeAlerts: number;
}

/** Cuadro geográfico del mapa, para que el frontend proyecte lat/lng a su lienzo. */
export interface MapConfig {
  center: { lat: number; lng: number };
  bounds: { north: number; south: number; east: number; west: number };
  defaultZoom: number;
}
