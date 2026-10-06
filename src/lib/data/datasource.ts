import type {
  ActiveAlertType,
  AlertEvent,
  FleetEvent,
  Hub,
  LoginInput,
  Purchase,
  RegisterInput,
  Reservation,
  ReservationInput,
  UnlockSession,
  Unsubscribe,
  User,
  Vehicle,
  VehicleMode,
} from "./types";

/**
 * Único punto de contacto entre la interfaz y los datos (RD5 / RNF-10).
 * Hay dos implementaciones intercambiables: `mock` (en memoria, para desarrollo y demos sin backend)
 * y `api` (REST + tiempo real contra el backend). Los componentes NUNCA importan una implementación.
 */
export interface DataSource {
  readonly kind: "mock" | "api";

  // Catálogo / flota / hubs (RF-02, 04, 06, 07, 14, 16, 17)
  listHubs(): Promise<Hub[]>;
  getHub(id: string): Promise<Hub | null>;
  listVehicles(filter?: { mode?: VehicleMode }): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | null>;
  /** Posición/estado en vivo (RF-08, RNF-01). Devuelve la función para cancelar. */
  subscribeFleet(onEvent: (event: FleetEvent) => void): Unsubscribe;

  // Alertas IoT (RF-11, 12, 15; RNF-02, 04)
  listAlerts(): Promise<AlertEvent[]>;
  triggerAlert(input: { vehicleId: string; type: ActiveAlertType }): Promise<AlertEvent>;
  clearAlert(vehicleId: string): Promise<void>;

  // Cuenta (RNF-03/05, RD11)
  me(): Promise<User | null>;
  register(input: RegisterInput): Promise<User>;
  login(input: LoginInput): Promise<User>;
  logout(): Promise<void>;
  enrollFace(template: number[]): Promise<User>;

  // Alquiler y compra (RF-03, 05)
  createReservation(input: ReservationInput): Promise<Reservation>;
  listReservations(): Promise<Reservation[]>;
  transitionReservation(id: string, event: "start" | "finish" | "cancel"): Promise<Reservation>;
  createPurchase(vehicleId: string): Promise<Purchase>;
  listPurchases(): Promise<Purchase[]>;

  // Desbloqueo en 3 pasos (RF-09, RF-10)
  createUnlockSession(vehicleId: string): Promise<UnlockSession>;
  scanQr(sessionId: string, code: string): Promise<UnlockSession>;
  verifyHelmet(
    sessionId: string,
    result: { helmetDetected: boolean; confidence: number },
  ): Promise<UnlockSession>;
  verifyFace(sessionId: string, result: { score: number }): Promise<UnlockSession>;
  /** Solo se acepta si la sesión está en `ready` (RF-09 paso 3). Crea la reserva activa. */
  startTrip(sessionId: string): Promise<Reservation>;

  // Gestión de catálogo y hubs por el operador (H7)
  saveVehicle(vehicle: Vehicle): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  saveHub(hub: Hub): Promise<Hub>;
  deleteHub(id: string): Promise<void>;
}
