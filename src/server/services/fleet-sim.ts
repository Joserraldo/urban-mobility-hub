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

/** Estado interno del paseo simulado: rumbo y batería con decimales (la BD guarda enteros). */
const walk = new Map<string, { heading: number; battery: number }>();
const CENTER = { lat: 7.1139, lng: -73.1098 };
const RECHARGE_BELOW = 25;

/**
 * Solo se mueven los vehículos que están en un viaje (`in_use`). Los disponibles quedan
 * estacionados donde están: el cliente tiene que poder caminar hasta ellos. El rumbo cambia
 * poco por tick (trayectoria suave) y, si se alejan >2,5 km del centro, giran hacia él.
 * La batería baja ~3 %/min; bajo 25 % el vehículo "vuelve al hub" y se recarga a 95 %.
 */
function moveFleet(): void {
  const rows = getDb()
    .prepare(
      `SELECT id, lat, lng, battery, mode, alert_state FROM vehicles
       WHERE mode = 'rent' AND status = 'in_use'`,
    )
    .all() as { id: string; lat: number; lng: number; battery: number; alert_state: string }[];

  for (const v of rows.slice(0, 12)) {
    let w = walk.get(v.id);
    // Primera vez, o el operador cambió la batería a mano: se resincroniza con la BD.
    if (!w || Math.abs(w.battery - v.battery) > 2) {
      w = { heading: Math.random() * Math.PI * 2, battery: v.battery };
      walk.set(v.id, w);
    }
    const dLat = v.lat - CENTER.lat;
    const dLng = v.lng - CENTER.lng;
    if (Math.hypot(dLat, dLng) > 0.022) w.heading = Math.atan2(-dLat, -dLng);
    else w.heading += (Math.random() - 0.5) * 0.7;
    const speedKmh = 12 + Math.random() * 12;
    const stepDeg = ((speedKmh / 3.6) * 2) / 111_000; // 2 s de recorrido
    w.battery = w.battery < RECHARGE_BELOW ? 95 : w.battery - (0.05 + Math.random() * 0.1);
    const t: Telemetry = {
      vehicleId: v.id,
      ts: Date.now(),
      lat: v.lat + Math.sin(w.heading) * stepDeg,
      lng: v.lng + Math.cos(w.heading) * stepDeg,
      battery: Math.round(w.battery * 100) / 100,
      speedKmh,
      helmetOn: true,
      impactG: 1,
      gpsFixAgeMs: 800,
      tripActive: true,
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

/** Historial de telemetría: máx. 1 fila por vehículo cada 10 s y retención de 24 h. */
export const TELEMETRY_MIN_INTERVAL_MS = 10_000;
export const TELEMETRY_RETENTION_MS = 24 * 60 * 60 * 1000;
const lastLogged = new Map<string, number>();
let lastPrune = 0;

/** Devuelve true si guardó la fila (false si el throttle la descartó). `now` se inyecta para pruebas. */
export function logTelemetry(t: Telemetry, alert: string, now = Date.now()): boolean {
  const last = lastLogged.get(t.vehicleId);
  if (last !== undefined && now - last < TELEMETRY_MIN_INTERVAL_MS) return false;
  lastLogged.set(t.vehicleId, now);
  repos.telemetry.insert({
    vehicle_id: t.vehicleId,
    ts: now,
    lat: t.lat,
    lng: t.lng,
    battery: Math.round(t.battery * 100) / 100,
    speed_kmh: Math.round(t.speedKmh * 10) / 10,
    helmet_on: t.helmetOn ? 1 : 0,
    impact_g: t.impactG,
    alert,
  });
  if (now - lastPrune > 10 * 60_000) {
    lastPrune = now;
    repos.telemetry.prune(now - TELEMETRY_RETENTION_MS);
  }
  return true;
}

/** Solo para pruebas: olvida el throttle en memoria. */
export function resetTelemetryThrottle(): void {
  lastLogged.clear();
  lastPrune = 0;
}

/**
 * Un solo camino para telemetría real/simulada (así el mismo código sirve al botón del operador).
 * Una alerta activa NO se borra con una lectura sana: queda hasta que el operador la atiende
 * (`POST /api/admin/alerts/{id}/clear`). Así el KPI de alertas activas no cae a 0 a los 2 s (R2).
 */
export function applyTelemetry(t: Telemetry, origin: "telemetry" | "simulator") {
  const evaluated = DB_ALERT[evaluateTelemetry(t)] ?? "ok";
  const prev = repos.vehicles.byId(t.vehicleId);
  if (!prev) return;
  const alert = evaluated === "ok" ? prev.alert_state : evaluated;
  repos.vehicles.updateLive(t.vehicleId, t.lat, t.lng, Math.round(t.battery), alert);
  logTelemetry(t, evaluated === "ok" ? prev.alert_state : evaluated);
  stream.emit("position", {
    type: "position",
    vehicleId: t.vehicleId,
    lat: t.lat,
    lng: t.lng,
    ts: t.ts,
    battery: t.battery,
    speedKmh: Math.round(t.speedKmh * 10) / 10,
  });

  if (evaluated !== "ok" && evaluated !== prev.alert_state) {
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
