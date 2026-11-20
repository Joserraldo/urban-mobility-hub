import type { DataSource } from "./datasource";
import { payWithBold, type EmbeddedPayload } from "./bold-embedded";
import {
  DataError,
  type AlertEvent,
  type FleetEvent,
  type Hub,
  type LoginInput,
  type MaintenanceList,
  type MaintenanceOrder,
  type Purchase,
  type TelemetrySample,
  type RegisterInput,
  type Reservation,
  type ReservationInput,
  type UnlockSession,
  type VehicleCameraStatus,
  type PcCameraVerdict,
  type Unsubscribe,
  type User,
  type Vehicle,
  type VehicleMode,
} from "./types";

/**
 * Adaptador `api`: REST real contra `/api/*` (SQLite en dev vía el plugin
 * `src/server/dev-api-plugin.ts`). Es el contrato de `docs/api/openapi.yaml`:
 * cambiar el transporte (a D1 + server routes) no toca los componentes (RNF-10).
 */

/**
 * En el navegador la URL relativa basta; en SSR (Node/Workers) `fetch("/api/…")`
 * no tiene origen: se resuelve contra `VITE_SSR_API_BASE` (dev: localhost:8080).
 */
function url(path: string): string {
  if (typeof window !== "undefined") return path;
  const runtimeBase = typeof process !== "undefined" ? process.env["UMH_INTERNAL_URL"] : undefined;
  const base =
    runtimeBase ??
    (import.meta.env["VITE_SSR_API_BASE"] as string | undefined) ??
    "http://localhost:8080";
  return `${base.replace(/\/$/, "")}${path}`;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url(path), {
    credentials: "same-origin",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } | string } | null)?.error;
    const message =
      typeof err === "string"
        ? err
        : (err?.message ??
          (data as { reason?: string } | null)?.reason ??
          `No se pudo completar la acción (código ${res.status}). Intenta de nuevo.`);
    const code =
      (typeof err === "object" && err?.code) ||
      (res.status === 401
        ? "unauthorized"
        : res.status === 403
          ? "forbidden"
          : res.status === 409
            ? "conflict"
            : res.status === 404
              ? "not_found"
              : res.status === 422 || res.status === 402
                ? "validation"
                : "unknown");
    throw new DataError(message, code as ConstructorParameters<typeof DataError>[1]);
  }
  return data as T;
}

/**
 * Con Bold el pago ocurre en su checkout: se redirige y la promesa no resuelve (la pantalla
 * queda en "procesando" mientras el navegador navega). Al volver, /pago/resultado muestra el estado.
 */
function goToCheckout(checkoutUrl: string): Promise<never> {
  window.location.assign(checkoutUrl);
  return new Promise<never>(() => undefined);
}

type BoldPay = {
  reference?: string | undefined;
  checkoutUrl?: string;
  embedded?: EmbeddedPayload;
  orderId?: string;
};

/**
 * Bold embebido: el pago se abre DENTRO de la página y la promesa resuelve cuando el servidor
 * confirma. Si el servidor solo entregó un link (sin llave secreta), se redirige como antes.
 */
async function settleBold(pay: BoldPay): Promise<void> {
  if (pay.embedded && pay.orderId) {
    const orderId = pay.orderId;
    await payWithBold(pay.embedded, () =>
      req<{ status: string; reason?: string | null }>(`/api/payments/bold/${orderId}`),
    );
    return;
  }
  if (pay.checkoutUrl) return goToCheckout(pay.checkoutUrl);
}

type VehicleRow = {
  id: string;
  kind: string;
  model: string;
  mode: string;
  battery: number;
  pricePerMinute?: number;
  price?: number;
  condition?: string;
  spec: string;
  hubId?: string;
  lat: number;
  lng: number;
  alert: string;
  delivery?: boolean;
  status?: string;
  qrCode?: string;
};
type HubRow = {
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
type ReservationRow = {
  id: string;
  vehicle_id: string;
  user_id: string;
  modality: string;
  address?: string | null;
  status: string;
  requested_at: number;
  started_at?: number | null;
  ended_at?: number | null;
  total_cost_cop?: number | null;
  prepaid?: boolean;
};
type PurchaseRow = {
  id: string;
  vehicle_id: string;
  user_id: string;
  price_cop: number;
  created_at: number;
};
type AlertRow = {
  id: string;
  vehicle_id: string;
  type: string;
  lat: number;
  lng: number;
  at: number;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  consentAt?: number;
  faceEnrolled?: boolean;
};
type UnlockRow = {
  id: string;
  vehicleId: string;
  step: string;
  expiresAt: number;
  reason?: string;
  helmetSource?: "camera" | "client";
};

/** El dominio/SSE usa snake para las alertas; el cliente habla `no-helmet` (RF-11). */
const ALERT_TYPES: Record<string, Vehicle["alert"]> = {
  ok: "ok",
  no_helmet: "no-helmet",
  crash: "crash",
  gps_lost: "gps-lost",
  low_battery: "low-battery",
  "no-helmet": "no-helmet",
  "gps-lost": "gps-lost",
  "low-battery": "low-battery",
};

const mapVehicle = (v: VehicleRow): Vehicle => ({
  id: v.id,
  kind: v.kind as Vehicle["kind"],
  model: v.model,
  mode: v.mode as VehicleMode,
  battery: Number(v.battery),
  pricePerMinute: v.pricePerMinute ?? undefined,
  price: v.price ?? undefined,
  condition: (v.condition as Vehicle["condition"]) ?? undefined,
  spec: v.spec,
  hubId: v.hubId ?? undefined,
  lat: Number(v.lat),
  lng: Number(v.lng),
  alert: ALERT_TYPES[v.alert] ?? "crash",
  delivery: Boolean(v.delivery),
  status: (v.status as Vehicle["status"]) ?? "available",
  qrCode: v.qrCode,
});

type MaintenanceRow = {
  id: string;
  vehicle_id: string;
  vehicle_model?: string;
  vehicle_kind?: string;
  reason: string;
  notes: string;
  opened_at: number;
  opened_by: string;
  closed_at: number | null;
  closed_by: string | null;
  resolution: string | null;
};
const mapOrder = (o: MaintenanceRow): MaintenanceOrder => ({
  id: o.id,
  vehicleId: o.vehicle_id,
  vehicleModel: o.vehicle_model ?? "",
  vehicleKind: (o.vehicle_kind ?? "scooter") as MaintenanceOrder["vehicleKind"],
  reason: o.reason,
  notes: o.notes,
  openedAt: Number(o.opened_at),
  openedBy: o.opened_by,
  closedAt: o.closed_at ?? undefined,
  closedBy: o.closed_by ?? undefined,
  resolution: o.resolution ?? undefined,
});

const mapHub = (h: HubRow): Hub => ({
  id: h.id,
  name: h.name,
  zone: h.zone,
  lat: Number(h.lat),
  lng: Number(h.lng),
  capacity: Number(h.capacity),
  occupied: Number(h.occupied),
  charging: Number(h.charging),
  active: Boolean(h.active),
});

const mapReservation = (r: ReservationRow & { paymentRef?: string | undefined }): Reservation => ({
  id: r.id,
  vehicleId: r.vehicle_id,
  userId: r.user_id,
  modality: r.modality as Reservation["modality"],
  address: r.address ?? undefined,
  status: r.status as Reservation["status"],
  createdAt: Number(r.requested_at),
  startedAt: r.started_at ?? undefined,
  endedAt: r.ended_at ?? undefined,
  totalCost: r.total_cost_cop ?? undefined,
  paymentRef: r.paymentRef,
  paid: r.prepaid ?? (r.paymentRef ? true : undefined),
});

const mapPurchase = (p: PurchaseRow & { paymentRef?: string | undefined }): Purchase => ({
  id: p.id,
  vehicleId: p.vehicle_id,
  userId: p.user_id,
  price: Number(p.price_cop),
  createdAt: Number(p.created_at),
  paymentRef: p.paymentRef,
});

const mapAlert = (a: AlertRow): AlertEvent => ({
  id: a.id,
  vehicleId: a.vehicle_id,
  type: (ALERT_TYPES[a.type] ?? "crash") as AlertEvent["type"],
  lat: Number(a.lat),
  lng: Number(a.lng),
  ts: Number(a.at),
});

const mapUser = (u: UserRow): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role as User["role"],
  consentAt: Number(u.consentAt ?? 0),
  faceEnrolled: Boolean(u.faceEnrolled),
});

const toUnlock = (s: UnlockRow): UnlockSession => ({
  id: s.id,
  vehicleId: s.vehicleId,
  step: s.step as UnlockSession["step"],
  reason: s.reason,
  expiresAt: Number(s.expiresAt),
  helmetSource: s.helmetSource,
});

export function createApiDataSource(): DataSource {
  return {
    kind: "api",

    listHubs: () => req<HubRow[]>("/api/hubs").then((rows) => rows.map(mapHub)),
    getHub: (id) => req<HubRow | null>(`/api/hubs/${id}`).then((h) => (h ? mapHub(h) : null)),
    listVehicles: (filter) =>
      req<VehicleRow[]>(`/api/vehicles${filter?.mode ? `?mode=${filter.mode}` : ""}`).then((rows) =>
        rows.map(mapVehicle),
      ),
    getVehicle: (id) =>
      req<VehicleRow | null>(`/api/vehicles/${id}`).then((v) => (v ? mapVehicle(v) : null)),

    subscribeFleet(onEvent: (event: FleetEvent) => void): Unsubscribe {
      const es = new EventSource("/api/stream");
      es.addEventListener("position", (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        onEvent({
          type: "position",
          vehicleId: d.vehicleId,
          lat: d.lat,
          lng: d.lng,
          ts: d.ts,
          battery: typeof d.battery === "number" ? d.battery : undefined,
          speedKmh: typeof d.speedKmh === "number" ? d.speedKmh : undefined,
        });
      });
      es.addEventListener("alert", (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        onEvent({ type: "alert", alert: mapAlert(d) });
      });
      es.addEventListener("vehicle", (e) => {
        const d = JSON.parse((e as MessageEvent).data);
        void req<VehicleRow>(`/api/vehicles/${d.vehicleId}`)
          .then((v) => onEvent({ type: "vehicle", vehicle: mapVehicle(v) }))
          .catch(() => undefined);
      });
      return () => es.close();
    },

    listAlerts: () => req<AlertRow[]>("/api/alerts").then((rows) => rows.map(mapAlert)),
    triggerAlert: async ({ vehicleId, type }) => {
      const created = await req<AlertRow | null>("/api/admin/simulate-alert", {
        method: "POST",
        body: JSON.stringify({ vehicleId, type }),
      });
      if (created) return mapAlert(created);
      const all = await req<AlertRow[]>("/api/alerts");
      const found = all.find((a) => a.vehicle_id === vehicleId);
      if (!found) throw new DataError("No se registró la alerta", "unknown");
      return mapAlert(found);
    },
    clearAlert: (vehicleId) =>
      req(`/api/admin/alerts/${vehicleId}/clear`, { method: "POST" }).then(() => undefined),

    me: async () => {
      try {
        const u = await req<UserRow | null>("/api/auth/me");
        return u ? mapUser(u) : null;
      } catch {
        return null;
      }
    },
    register: (input: RegisterInput) =>
      req<UserRow>("/api/auth/register", { method: "POST", body: JSON.stringify(input) }).then(
        mapUser,
      ),
    login: (input: LoginInput) =>
      req<UserRow>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }).then(
        mapUser,
      ),
    logout: () => req("/api/auth/logout", { method: "POST" }).then(() => undefined),
    enrollFace: () =>
      req<UserRow>("/api/auth/face", {
        method: "POST",
        body: JSON.stringify({ enrolled: true }),
      }).then(mapUser),

    createReservation: async (input: ReservationInput) => {
      const created = await req<{ reservation: ReservationRow; prepayCop: number }>(
        "/api/reservations",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      const pay = await req<BoldPay>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          ownerType: "reservation",
          ownerId: created.reservation.id,
          method: "card",
        }),
      });
      await settleBold(pay);
      // settleBold solo resuelve con el pago aprobado (o redirige al link de Bold).
      return {
        ...mapReservation({ ...created.reservation, paymentRef: pay.reference }),
        paid: true,
      };
    },
    payReservation: async (id) => {
      const pay = await req<BoldPay>("/api/payments", {
        method: "POST",
        body: JSON.stringify({ ownerType: "reservation", ownerId: id, method: "card" }),
      });
      await settleBold(pay);
      const rows = await req<ReservationRow[]>("/api/reservations");
      const found = rows.find((r) => r.id === id);
      if (!found) throw new DataError("Reserva no encontrada", "not_found");
      return mapReservation(found);
    },
    listReservations: () =>
      req<ReservationRow[]>("/api/reservations").then((rows) => rows.map(mapReservation)),
    transitionReservation: async (id, event) => {
      if (event === "cancel") {
        await req(`/api/reservations/${id}/cancel`, { method: "POST" });
      } else if (event === "finish") {
        const end = await req<BoldPay>(`/api/trips/${id}/end`, { method: "POST" });
        await settleBold(end ?? {});
      } else {
        throw new DataError("El viaje inicia desbloqueando el vehículo", "conflict");
      }
      const rows = await req<ReservationRow[]>("/api/reservations");
      const found = rows.find((r) => r.id === id);
      if (!found) throw new DataError("Reserva no encontrada", "not_found");
      return mapReservation(found);
    },
    createPurchase: async (vehicleId) => {
      const created = await req<{ purchase: PurchaseRow }>("/api/purchases", {
        method: "POST",
        body: JSON.stringify({ vehicleId }),
      });
      const pay = await req<BoldPay>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          ownerType: "purchase",
          ownerId: created.purchase.id,
          method: "card",
        }),
      });
      await settleBold(pay);
      return mapPurchase({ ...created.purchase, paymentRef: pay.reference });
    },
    listPurchases: () => req<PurchaseRow[]>("/api/purchases").then((rows) => rows.map(mapPurchase)),

    createUnlockSession: async (vehicleId) => {
      const reservations = await req<ReservationRow[]>("/api/reservations");
      // Si hubiera varias abiertas para el mismo vehículo, se prefiere la que ya tiene el prepago.
      const open = reservations.filter(
        (r) => r.vehicle_id === vehicleId && r.status === "requested",
      );
      const reservation = open.find((r) => r.prepaid) ?? open[0];
      return req<UnlockRow>("/api/unlock/sessions", {
        method: "POST",
        body: JSON.stringify({ vehicleId, reservationId: reservation?.id }),
      }).then(toUnlock);
    },
    scanQr: (sessionId, code) =>
      req<UnlockRow>(`/api/unlock/sessions/${sessionId}/qr`, {
        method: "POST",
        body: JSON.stringify({ code }),
      }).then(toUnlock),
    verifyHelmet: (sessionId, result) =>
      req<UnlockRow>(`/api/unlock/sessions/${sessionId}/helmet`, {
        method: "POST",
        body: JSON.stringify(result),
      }).then(toUnlock),
    vehicleCamera: (vehicleId) =>
      req<VehicleCameraStatus>(`/api/vehicles/${encodeURIComponent(vehicleId)}/camera`),
    sendPcCameraFrame: async (vehicleId, jpeg) => {
      const r = await req<{ ok: number; h?: number; c?: number }>(
        `/api/admin/camera/${encodeURIComponent(vehicleId)}/frame`,
        { method: "POST", body: jpeg, headers: { "content-type": "image/jpeg" } },
      );
      return { helmetDetected: r.h === 1, confidence: (r.c ?? 0) / 100 };
    },
    verifyFace: (sessionId, result) =>
      req<UnlockRow>(`/api/unlock/sessions/${sessionId}/face`, {
        method: "POST",
        body: JSON.stringify(result),
      }).then(toUnlock),
    startTrip: (sessionId) =>
      req<{ reservation: ReservationRow }>(`/api/unlock/sessions/${sessionId}/start`, {
        method: "POST",
      }).then((r) => mapReservation(r.reservation)),

    saveVehicle: async (vehicle) => {
      const saved = await req<VehicleRow>("/api/admin/vehicles", {
        method: "POST",
        body: JSON.stringify({
          id: vehicle.id,
          kind: vehicle.kind,
          model: vehicle.model,
          mode: vehicle.mode,
          condition: vehicle.condition ?? null,
          price_cop: vehicle.price ?? null,
          rate_per_min_cop: vehicle.pricePerMinute ?? null,
          spec: vehicle.spec,
          hub_id: vehicle.hubId ?? null,
          deliverable: vehicle.delivery ? 1 : 0,
        }),
      });
      return mapVehicle(saved);
    },
    setVehicleStatus: (id, status) =>
      req<{ vehicle: VehicleRow; cancelled: number }>(
        `/api/admin/vehicles/${encodeURIComponent(id)}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      ).then((r) => ({ vehicle: mapVehicle(r.vehicle), cancelled: Number(r.cancelled ?? 0) })),
    listMaintenance: () =>
      req<{ open: MaintenanceRow[]; closed: MaintenanceRow[] }>("/api/admin/maintenance").then(
        (r): MaintenanceList => ({ open: r.open.map(mapOrder), closed: r.closed.map(mapOrder) }),
      ),
    sendToMaintenance: (vehicleId, input) =>
      req<{ order: MaintenanceRow; cancelled: number }>(
        `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/maintenance`,
        { method: "POST", body: JSON.stringify(input) },
      ).then((r) => ({ order: mapOrder(r.order), cancelled: Number(r.cancelled ?? 0) })),
    closeMaintenance: (orderId, resolution) =>
      req<{ order: MaintenanceRow; vehicle: VehicleRow }>(
        `/api/admin/maintenance/${encodeURIComponent(orderId)}/close`,
        { method: "POST", body: JSON.stringify({ resolution }) },
      ).then((r) => ({ order: mapOrder(r.order), vehicle: mapVehicle(r.vehicle) })),
    vehicleTelemetry: (vehicleId, minutes = 60) =>
      req<
        {
          ts: number;
          lat: number;
          lng: number;
          battery: number;
          speed_kmh: number;
          helmet_on: number;
          impact_g: number;
          alert: string;
        }[]
      >(`/api/admin/vehicles/${encodeURIComponent(vehicleId)}/telemetry?minutes=${minutes}`).then(
        (rows): TelemetrySample[] =>
          rows.map((r) => ({
            ts: Number(r.ts),
            lat: Number(r.lat),
            lng: Number(r.lng),
            battery: Number(r.battery),
            speedKmh: Number(r.speed_kmh),
            helmetOn: Boolean(r.helmet_on),
            impactG: Number(r.impact_g),
            alert: r.alert,
          })),
      ),
    saveHub: async (hub) => {
      const saved = await req<HubRow>("/api/admin/hubs", {
        method: "POST",
        body: JSON.stringify({ ...hub, active: hub.active ? 1 : 0 }),
      });
      return mapHub(saved);
    },
    deleteHub: (id) => req(`/api/admin/hubs/${id}`, { method: "DELETE" }).then(() => undefined),
  };
}
