import type { DataSource } from "./datasource";
import {
  DataError,
  type ActiveAlertType,
  type AlertEvent,
  type FleetEvent,
  type Hub,
  type Purchase,
  type Reservation,
  type UnlockSession,
  type User,
  type Vehicle,
} from "./types";

// Adaptador en memoria. Sirve para desarrollar y mostrar la interfaz sin backend.
// Las cuentas/reservas/compras se guardan en localStorage del navegador (solo en este adaptador).

export const SEED_HUBS: Hub[] = [
  {
    id: "HUB-01",
    name: "Hub Cabecera",
    zone: "Cabecera del Llano",
    lat: 7.1193,
    lng: -73.109,
    capacity: 40,
    occupied: 27,
    charging: 9,
    active: true,
  },
  {
    id: "HUB-02",
    name: "Hub UNAB El Jardín",
    zone: "Campus Universitario",
    lat: 7.1098,
    lng: -73.1066,
    capacity: 25,
    occupied: 18,
    charging: 6,
    active: true,
  },
  {
    id: "HUB-03",
    name: "Hub San Pío",
    zone: "Centro",
    lat: 7.1163,
    lng: -73.1213,
    capacity: 30,
    occupied: 11,
    charging: 4,
    active: true,
  },
  {
    id: "HUB-04",
    name: "Hub Floridablanca",
    zone: "Floridablanca",
    lat: 7.0621,
    lng: -73.0869,
    capacity: 20,
    occupied: 14,
    charging: 3,
    active: false,
  },
];

const rent = (v: Omit<Vehicle, "mode">): Vehicle => ({ ...v, mode: "rent" });
const sale = (v: Omit<Vehicle, "mode" | "alert">): Vehicle => ({ ...v, mode: "sale", alert: "ok" });

export const SEED_VEHICLES: Vehicle[] = [
  rent({
    id: "SC-1042",
    kind: "scooter",
    model: "Volt S2",
    battery: 87,
    pricePerMinute: 450,
    spec: "Autonomía 32 km · 25 km/h",
    lat: 7.1171,
    lng: -73.1142,
    alert: "ok",
  }),
  rent({
    id: "SC-1088",
    kind: "scooter",
    model: "Volt S2",
    battery: 64,
    pricePerMinute: 450,
    spec: "Autonomía 32 km · 25 km/h",
    lat: 7.1128,
    lng: -73.1098,
    alert: "ok",
  }),
  rent({
    id: "SC-1120",
    kind: "scooter",
    model: "Volt Pro",
    battery: 19,
    pricePerMinute: 520,
    spec: "Autonomía 45 km · 30 km/h",
    lat: 7.1186,
    lng: -73.1178,
    alert: "low-battery",
    hubId: "HUB-03",
  }),
  rent({
    id: "BK-2201",
    kind: "bike",
    model: "Urban e-Bike",
    battery: 92,
    pricePerMinute: 380,
    spec: "Pedaleo asistido · 60 km",
    lat: 7.1149,
    lng: -73.1031,
    alert: "ok",
    delivery: true,
  }),
  rent({
    id: "BK-2244",
    kind: "bike",
    model: "Urban e-Bike",
    battery: 71,
    pricePerMinute: 380,
    spec: "Pedaleo asistido · 60 km",
    lat: 7.1102,
    lng: -73.1059,
    alert: "ok",
    hubId: "HUB-02",
  }),
  rent({
    id: "DR-3301",
    kind: "drone",
    model: "AeroLift 4",
    battery: 58,
    pricePerMinute: 1200,
    spec: "Carga 5 kg · 22 min de vuelo",
    lat: 7.1205,
    lng: -73.1102,
    alert: "ok",
    delivery: true,
    hubId: "HUB-01",
  }),
  rent({
    id: "DR-3315",
    kind: "drone",
    model: "AeroLift 4",
    battery: 34,
    pricePerMinute: 1200,
    spec: "Carga 5 kg · 22 min de vuelo",
    lat: 7.1226,
    lng: -73.1255,
    alert: "gps-lost",
  }),
  sale({
    id: "SV-5001",
    kind: "scooter",
    model: "Volt S2 Edition",
    battery: 100,
    price: 2890000,
    condition: "nuevo",
    spec: "500 W · 32 km · IPX5",
    hubId: "HUB-01",
    lat: 7.1193,
    lng: -73.109,
  }),
  sale({
    id: "SV-5002",
    kind: "scooter",
    model: "Volt Pro",
    battery: 96,
    price: 3750000,
    condition: "seminuevo",
    spec: "750 W · 45 km · suspensión dual",
    hubId: "HUB-02",
    lat: 7.1098,
    lng: -73.1066,
  }),
  sale({
    id: "SV-5003",
    kind: "bike",
    model: "Urban e-Bike Lite",
    battery: 100,
    price: 4200000,
    condition: "nuevo",
    spec: "250 W · 60 km · aluminio",
    hubId: "HUB-03",
    lat: 7.1163,
    lng: -73.1213,
  }),
  sale({
    id: "SV-5004",
    kind: "drone",
    model: "AeroLift 4 Cargo",
    battery: 100,
    price: 9800000,
    condition: "nuevo",
    spec: "Carga 5 kg · GPS RTK",
    hubId: "HUB-01",
    lat: 7.1193,
    lng: -73.109,
  }),
];

const LS = {
  users: "umh.mock.users",
  session: "umh.mock.session",
  reservations: "umh.mock.reservations",
  purchases: "umh.mock.purchases",
  alerts: "umh.mock.alerts",
};
const UNLOCK_TTL_MS = 120_000;

type StoredUser = User & { passwordHash: string; faceTemplate?: number[] };

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;
const load = <T>(key: string, fallback: T): T => {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string, value: unknown) => {
  if (hasStorage()) window.localStorage.setItem(key, JSON.stringify(value));
};
const uid = (p: string) =>
  `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
const delay = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`umh-mock:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const cosine = (a: number[], b: number[]) => {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

// Cuentas de demostración (solo adaptador mock): operador@nodo.co / Operador123! y usuario@nodo.co / Usuario123!
async function ensureSeedUsers() {
  if (!hasStorage() || load<StoredUser[]>(LS.users, []).length > 0) return;
  const base = { consentAt: Date.now(), faceEnrolled: false };
  save(LS.users, [
    {
      ...base,
      id: "U-operador",
      name: "Operador NODO",
      email: "operador@nodo.co",
      role: "operator",
      passwordHash: await hashPassword("Operador123!"),
    },
    {
      ...base,
      id: "U-usuario",
      name: "Usuario Demo",
      email: "usuario@nodo.co",
      role: "user",
      passwordHash: await hashPassword("Usuario123!"),
    },
  ] satisfies StoredUser[]);
}

export function createMockDataSource(): DataSource {
  let hubs: Hub[] = structuredClone(SEED_HUBS);
  let vehicles: Vehicle[] = structuredClone(SEED_VEHICLES);
  let alerts: AlertEvent[] = load<AlertEvent[]>(LS.alerts, []);
  const sessions = new Map<string, UnlockSession & { faceOk?: boolean }>();
  const listeners = new Set<(e: FleetEvent) => void>();
  let timer: ReturnType<typeof setInterval> | undefined;

  const emit = (e: FleetEvent) => listeners.forEach((l) => l(e));

  const tick = () => {
    const ts = Date.now();
    for (const v of vehicles) {
      if (v.mode !== "rent" || v.alert === "gps-lost") continue;
      v.lat += (Math.random() - 0.5) * 0.0006;
      v.lng += (Math.random() - 0.5) * 0.0006;
      emit({ type: "position", vehicleId: v.id, lat: v.lat, lng: v.lng, ts });
    }
  };

  const currentUser = (): StoredUser | null => {
    const id = load<string | null>(LS.session, null);
    return id ? (load<StoredUser[]>(LS.users, []).find((u) => u.id === id) ?? null) : null;
  };
  const requireUser = () => {
    const u = currentUser();
    if (!u) throw new DataError("Inicia sesión para continuar", "unauthorized");
    return u;
  };
  const publicUser = ({ passwordHash: _p, faceTemplate: _f, ...u }: StoredUser): User => u;
  const requireVehicle = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    if (!v) throw new DataError("Vehículo no encontrado", "not_found");
    return v;
  };

  return {
    kind: "mock",

    async listHubs() {
      await delay();
      return structuredClone(hubs);
    },
    async getHub(id) {
      await delay();
      return structuredClone(hubs.find((h) => h.id === id) ?? null);
    },
    async listVehicles(filter) {
      await delay();
      return structuredClone(vehicles.filter((v) => !filter?.mode || v.mode === filter.mode));
    },
    async getVehicle(id) {
      await delay();
      return structuredClone(vehicles.find((v) => v.id === id) ?? null);
    },
    subscribeFleet(onEvent) {
      listeners.add(onEvent);
      if (!timer) timer = setInterval(tick, 2000);
      return () => {
        listeners.delete(onEvent);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },

    async listAlerts() {
      await delay();
      return [...alerts].sort((a, b) => b.ts - a.ts);
    },
    async triggerAlert({ vehicleId, type }: { vehicleId: string; type: ActiveAlertType }) {
      const v = requireVehicle(vehicleId);
      if (v.mode !== "rent")
        throw new DataError("Solo se simulan alertas en vehículos de alquiler", "validation");
      v.alert = type;
      const event: AlertEvent = {
        id: uid("AL"),
        vehicleId,
        type,
        lat: v.lat,
        lng: v.lng,
        ts: Date.now(),
      };
      alerts = [event, ...alerts].slice(0, 200);
      save(LS.alerts, alerts);
      emit({ type: "vehicle", vehicle: structuredClone(v) });
      emit({ type: "alert", alert: event });
      return event;
    },
    async clearAlert(vehicleId) {
      const v = requireVehicle(vehicleId);
      v.alert = "ok";
      emit({ type: "vehicle", vehicle: structuredClone(v) });
    },

    async me() {
      await delay(60);
      const u = currentUser();
      return u ? publicUser(u) : null;
    },
    async register({ name, email, password, consent }) {
      await ensureSeedUsers();
      await delay();
      if (!consent)
        throw new DataError(
          "Debes aceptar el tratamiento de datos (Ley 1581 de 2012)",
          "validation",
        );
      const users = load<StoredUser[]>(LS.users, []);
      const mail = email.trim().toLowerCase();
      if (users.some((u) => u.email === mail))
        throw new DataError("Ese correo ya está registrado", "conflict");
      const user: StoredUser = {
        id: uid("U"),
        name: name.trim(),
        email: mail,
        role: "user",
        consentAt: Date.now(),
        faceEnrolled: false,
        passwordHash: await hashPassword(password),
      };
      save(LS.users, [...users, user]);
      save(LS.session, user.id);
      return publicUser(user);
    },
    async login({ email, password }) {
      await ensureSeedUsers();
      await delay();
      const mail = email.trim().toLowerCase();
      const hash = await hashPassword(password);
      const user = load<StoredUser[]>(LS.users, []).find(
        (u) => u.email === mail && u.passwordHash === hash,
      );
      if (!user) throw new DataError("Correo o contraseña incorrectos", "unauthorized");
      save(LS.session, user.id);
      return publicUser(user);
    },
    async logout() {
      save(LS.session, null);
    },
    async enrollFace(template) {
      const me = requireUser();
      const users = load<StoredUser[]>(LS.users, []).map((u) =>
        u.id === me.id ? { ...u, faceEnrolled: true, faceTemplate: template } : u,
      );
      save(LS.users, users);
      return publicUser(users.find((u) => u.id === me.id)!);
    },

    async createReservation({ vehicleId, modality, address }) {
      const me = requireUser();
      const v = requireVehicle(vehicleId);
      if (v.mode !== "rent") throw new DataError("Este vehículo no está en alquiler", "validation");
      if (modality === "delivery" && !v.delivery)
        throw new DataError("Este vehículo no admite entrega a domicilio", "validation");
      if (modality === "delivery" && !address?.trim())
        throw new DataError("Indica la dirección de entrega", "validation");
      const all = load<Reservation[]>(LS.reservations, []);
      if (
        all.some(
          (r) => r.vehicleId === vehicleId && (r.status === "requested" || r.status === "active"),
        )
      )
        throw new DataError("El vehículo ya está reservado", "conflict");
      const reservation: Reservation = {
        id: uid("R"),
        vehicleId,
        userId: me.id,
        modality,
        status: "requested",
        createdAt: Date.now(),
        ...(address ? { address: address.trim() } : {}),
      };
      save(LS.reservations, [reservation, ...all]);
      return reservation;
    },
    async listReservations() {
      await delay(60);
      const me = currentUser();
      return me ? load<Reservation[]>(LS.reservations, []).filter((r) => r.userId === me.id) : [];
    },
    async transitionReservation(id, event) {
      const me = requireUser();
      const all = load<Reservation[]>(LS.reservations, []);
      const r = all.find((x) => x.id === id && x.userId === me.id);
      if (!r) throw new DataError("Reserva no encontrada", "not_found");
      const next = {
        start: { requested: "active" },
        finish: { active: "completed" },
        cancel: { requested: "cancelled", active: "cancelled" },
      }[event][r.status as "requested" | "active"];
      if (!next) throw new DataError(`No se puede ${event} una reserva ${r.status}`, "conflict");
      r.status = next as Reservation["status"];
      if (event === "start") r.startedAt = Date.now();
      if (event === "finish" || event === "cancel") {
        r.endedAt = Date.now();
        if (event === "finish" && r.startedAt) {
          const minutes = Math.max(1, Math.ceil((r.endedAt - r.startedAt) / 60000));
          r.totalCost = minutes * (requireVehicle(r.vehicleId).pricePerMinute ?? 0);
        }
      }
      save(LS.reservations, all);
      return { ...r };
    },
    async createPurchase(vehicleId) {
      const me = requireUser();
      const v = requireVehicle(vehicleId);
      if (v.mode !== "sale") throw new DataError("Este vehículo no está en venta", "validation");
      const all = load<Purchase[]>(LS.purchases, []);
      if (all.some((p) => p.vehicleId === vehicleId))
        throw new DataError("Este vehículo ya fue vendido", "conflict");
      const purchase: Purchase = {
        id: uid("P"),
        vehicleId,
        userId: me.id,
        price: v.price ?? 0,
        createdAt: Date.now(),
      };
      save(LS.purchases, [purchase, ...all]);
      return purchase;
    },
    async listPurchases() {
      await delay(60);
      const me = currentUser();
      return me ? load<Purchase[]>(LS.purchases, []).filter((p) => p.userId === me.id) : [];
    },

    async createUnlockSession(vehicleId) {
      requireUser();
      const v = requireVehicle(vehicleId);
      if (v.mode !== "rent") throw new DataError("Este vehículo no está en alquiler", "validation");
      const s: UnlockSession = {
        id: uid("UL"),
        vehicleId,
        step: "qr",
        expiresAt: Date.now() + UNLOCK_TTL_MS,
      };
      sessions.set(s.id, s);
      return { ...s };
    },
    async scanQr(sessionId, code) {
      const s = this_session(sessions, sessionId);
      if (s.step !== "qr") throw new DataError("Orden de pasos inválido", "conflict");
      if (code.trim() === `UMH:${s.vehicleId}`) s.step = "helmet";
      else {
        s.step = "denied";
        s.reason = "El código QR no corresponde a este vehículo";
      }
      return { ...s };
    },
    async verifyHelmet(sessionId, { helmetDetected, confidence }) {
      const s = this_session(sessions, sessionId);
      if (s.step !== "helmet") throw new DataError("Primero escanea el código QR", "conflict");
      if (helmetDetected && confidence >= 0.8) s.step = "ready";
      else {
        s.step = "denied";
        s.reason = "No se detectó el casco con suficiente confianza";
      }
      return { ...s };
    },
    async verifyFace(sessionId, { score }) {
      const me = requireUser();
      const s = this_session(sessions, sessionId);
      if (s.step !== "qr") throw new DataError("Orden de pasos inválido", "conflict");
      if (!me.faceEnrolled) {
        s.reason = "Aún no registras tu rostro";
        throw new DataError(s.reason, "forbidden");
      }
      if (score >= 0.85) s.step = "helmet";
      else {
        s.step = "denied";
        s.reason = "No reconocimos tu rostro";
      }
      return { ...s };
    },
    async startTrip(sessionId) {
      const me = requireUser();
      const s = this_session(sessions, sessionId);
      if (s.step !== "ready") throw new DataError("Completa la verificación del casco", "conflict");
      const all = load<Reservation[]>(LS.reservations, []);
      const existing = all.find(
        (r) => r.vehicleId === s.vehicleId && r.userId === me.id && r.status === "requested",
      );
      const reservation: Reservation = existing ?? {
        id: uid("R"),
        vehicleId: s.vehicleId,
        userId: me.id,
        modality: "hub",
        status: "requested",
        createdAt: Date.now(),
      };
      reservation.status = "active";
      reservation.startedAt = Date.now();
      save(LS.reservations, [reservation, ...all.filter((r) => r.id !== reservation.id)]);
      sessions.delete(sessionId);
      return { ...reservation };
    },

    async saveVehicle(vehicle) {
      const operator = requireUser();
      if (operator.role !== "operator") throw new DataError("Solo operadores", "forbidden");
      const i = vehicles.findIndex((v) => v.id === vehicle.id);
      if (i >= 0) vehicles[i] = { ...vehicle };
      else vehicles = [...vehicles, { ...vehicle }];
      emit({ type: "vehicle", vehicle: { ...vehicle } });
      return { ...vehicle };
    },
    async deleteVehicle(id) {
      const operator = requireUser();
      if (operator.role !== "operator") throw new DataError("Solo operadores", "forbidden");
      vehicles = vehicles.filter((v) => v.id !== id);
    },
    async saveHub(hub) {
      const operator = requireUser();
      if (operator.role !== "operator") throw new DataError("Solo operadores", "forbidden");
      const i = hubs.findIndex((h) => h.id === hub.id);
      if (i >= 0) hubs[i] = { ...hub };
      else hubs = [...hubs, { ...hub }];
      return { ...hub };
    },
    async deleteHub(id) {
      const operator = requireUser();
      if (operator.role !== "operator") throw new DataError("Solo operadores", "forbidden");
      hubs = hubs.filter((h) => h.id !== id);
    },
  };
}

function this_session(map: Map<string, UnlockSession>, id: string) {
  const s = map.get(id);
  if (!s) throw new DataError("Sesión de desbloqueo no encontrada", "not_found");
  if (Date.now() > s.expiresAt) {
    s.step = "expired";
    throw new DataError("La sesión de desbloqueo expiró", "conflict");
  }
  return s;
}

export { cosine };
