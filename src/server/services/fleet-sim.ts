import { getDb } from "../db";
import { uid } from "../db/seed";
import { repos } from "../repositories";
import { evaluateTelemetry, type Telemetry } from "../domain/alerts";
import { notifyLateDelivery } from "./brevo";
import { stream } from "./stream";

let timers: { move?: ReturnType<typeof setInterval>; late?: ReturnType<typeof setInterval> } = {};

/**
 * Gemelos digitales (RF-08/RF-16, riesgo RD5): en local, un intervalo sustituye al
 * broker MQTT con los mismos topics lógicos `umh/vehicle/{id}/telemetry`. El ciclo
 * de entregas revisa el deadline (UC17 automático → UC19 correo).
 */
export function startSimulator(): void {
  if (timers.move) return;
  timers.move = setInterval(moveFleet, 2000);
  timers.late = setInterval(checkLate, 20_000);
}

export function stopSimulator(): void {
  clearInterval(timers.move);
  clearInterval(timers.late);
  timers = {};
}

function moveFleet(): void {
  const rows = getDb()
    .prepare(
      `SELECT id, lat, lng, battery, mode, alert_state FROM vehicles
       WHERE mode = 'rent' AND status IN ('available','in_use')`,
    )
    .all() as { id: string; lat: number; lng: number; battery: number; alert_state: string }[];

  for (const v of rows.slice(0, 12)) {
    const t: Telemetry = {
      vehicleId: v.id,
      ts: Date.now(),
      lat: v.lat + (Math.random() - 0.5) * 0.0016,
      lng: v.lng + (Math.random() - 0.5) * 0.0016,
      battery: Math.max(4, Math.round((v.battery - Math.random() * 0.35) * 100) / 100),
      speedKmh: 12 + Math.random() * 12,
      helmetOn: true,
      impactG: 1,
      gpsFixAgeMs: 800,
      tripActive: false,
    };
    applyTelemetry(t, "telemetry");
  }
}

/** El dominio usa `no-helmet`; las tablas usan snake (`no_helmet`): un solo puente. */
const DB_ALERT: Record<string, string> = {
  ok: "ok",
  "no-helmet": "no_helmet",
  crash: "crash",
  "gps-lost": "gps_lost",
  "low-battery": "low_battery",
};

/** Un solo camino para telemetría real/simulada (así el mismo código sirve al botón del operador). */
export function applyTelemetry(t: Telemetry, origin: "telemetry" | "simulator") {
  const alert = DB_ALERT[evaluateTelemetry(t)] ?? "ok";
  const prev = repos.vehicles.byId(t.vehicleId);
  if (!prev) return;
  repos.vehicles.updateLive(t.vehicleId, t.lat, t.lng, Math.round(t.battery), alert);
  stream.emit("position", {
    type: "position",
    vehicleId: t.vehicleId,
    lat: t.lat,
    lng: t.lng,
    ts: t.ts,
  });

  if (alert !== "ok" && prev.alert_state === "ok") {
    const a = {
      id: uid("ALR"),
      vehicle_id: t.vehicleId,
      type: alert,
      lat: t.lat,
      lng: t.lng,
      at: t.ts,
      origin,
    };
    repos.alerts.insert(a);
    stream.emit("alert", { ...a, lat: t.lat, lng: t.lng });
  }
}

async function checkLate(): Promise<void> {
  for (const d of repos.deliveries.overdue()) {
    markLate(d.id as string, "cron: superó el deadline sin entrega");
  }
}

export function markLate(deliveryId: string, reason: string): void {
  const d = repos.deliveries.byId(deliveryId);
  if (!d || d.status === "delivered") return;
  repos.deliveries.update(deliveryId, { status: "late", reason });
  stream.emit("notification", { deliveryId, status: "late", reason });

  const reservation = repos.reservations.byId(d.reservation_id as string);
  if (!reservation) return;
  const customer = getDb()
    .prepare("SELECT name, email FROM users WHERE id = ?")
    .get(reservation.user_id as string) as { name: string; email: string } | undefined;
  const courier = getDb()
    .prepare("SELECT name FROM users WHERE id = ?")
    .get(d.courier_id as string) as { name: string } | undefined;
  const operator = repos.users.firstOperator() as { email?: string } | undefined;
  const vehicle = repos.vehicles.byId(reservation.vehicle_id as string) as
    { model?: string } | undefined;

  void notifyLateDelivery(deliveryId, {
    customerEmail: customer?.email ?? "",
    customerName: customer?.name ?? "cliente",
    operatorEmail: operator?.email ?? "",
    courierName: courier?.name ?? "el domiciliario",
    vehicleModel: vehicle?.model ?? "vehículo",
    address: (reservation.address as string) ?? "",
    minutesLate: Math.max(1, Math.round((Date.now() - (d.deadline_at as number)) / 60_000)),
  });
}
