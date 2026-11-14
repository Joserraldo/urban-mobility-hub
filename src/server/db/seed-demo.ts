import type { DatabaseSync } from "node:sqlite";
import { hashPassword, uid } from "./seed";

/**
 * Datos demo "ricos" para presentaciones (opt-in con `UMH_SEED_DEMO=1`, idempotente).
 * Se mantiene APARTE de `seedIfEmpty` para no alterar las pruebas, que asumen una base
 * mínima. Agrega: más clientes y domiciliarios, más dispositivos (scooter/bici/dron/venta),
 * historial de viajes con pagos, una compra, entregas (a tiempo y tarde), alertas IoT y
 * notificaciones de correo. Contraseña de todas las cuentas nuevas: `Demo1234!`.
 */
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

export function seedDemoData(db: DatabaseSync): void {
  const done = db.prepare("SELECT 1 FROM users WHERE email = ?").get("cliente3@demo.co");
  if (done) return;
  const now = Date.now();

  // --- Usuarios (con consentimiento de datos personales) ---
  const insUser = db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
  );
  const insConsent = db.prepare(
    "INSERT INTO consents (id, user_id, purpose, accepted_at, revoked) VALUES (?,?,?,?,0)",
  );
  const users: [string, string, string, string][] = [
    ["USRF-CLIENTE3", "Carla Cliente", "cliente3@demo.co", "user"],
    ["USRG-CLIENTE4", "Daniel Cliente", "cliente4@demo.co", "user"],
    ["USRH-CLIENTE5", "Elena Cliente", "cliente5@demo.co", "user"],
    ["USRI-DOMI3", "Felipe domiciliario", "domi3@demo.co", "courier"],
  ];
  for (const [id, name, email, role] of users) {
    insUser.run(id, name, email, hashPassword("Demo1234!"), role, now - 20 * DAY);
    insConsent.run(uid("CON"), id, "datos_personales", now - 20 * DAY);
  }

  // --- Dispositivos adicionales (vehículos con telemetría IoT) ---
  const insVeh = db.prepare(
    `INSERT INTO vehicles (id, kind, model, mode, status, condition, price_cop, rate_per_min_cop,
      spec, battery, lat, lng, hub_id, alert_state, deliverable, qr_code)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const extra: [
    string,
    string,
    string,
    string,
    string | null,
    number | null,
    number | null,
    string,
    number,
    number,
    number,
    string,
    number,
  ][] = [
    // id, kind, model, mode, condition, price, rate, spec, battery, lat, lng, hub, deliverable
    [
      "SC-1150",
      "scooter",
      "Volt S3",
      "rent",
      null,
      null,
      480,
      "Autonomía 40 km · 25 km/h",
      92,
      7.1185,
      -73.1101,
      "HUB-01",
      1,
    ],
    [
      "SC-1163",
      "scooter",
      "Volt S2",
      "rent",
      null,
      null,
      450,
      "Autonomía 32 km · 25 km/h",
      64,
      7.1101,
      -73.1058,
      "HUB-02",
      0,
    ],
    [
      "BK-2260",
      "bike",
      "Eco E-Bike",
      "rent",
      null,
      null,
      380,
      "Autonomía 60 km · asistida 25 km/h",
      78,
      7.1165,
      -73.1208,
      "HUB-03",
      1,
    ],
    [
      "DR-3330",
      "drone",
      "Cargo D2",
      "rent",
      null,
      null,
      900,
      "Carga 3 kg · 18 min de vuelo",
      88,
      7.1195,
      -73.1092,
      "HUB-01",
      1,
    ],
    [
      "SV-5005",
      "scooter",
      "Volt S3 (venta)",
      "sale",
      "nuevo",
      2_890_000,
      null,
      "Autonomía 40 km · garantía 12 meses",
      100,
      7.1096,
      -73.1069,
      "HUB-02",
      0,
    ],
    [
      "SV-5006",
      "bike",
      "Eco E-Bike (venta)",
      "sale",
      "seminuevo",
      2_150_000,
      null,
      "Autonomía 60 km · 1 año de uso",
      100,
      7.1166,
      -73.121,
      "HUB-03",
      0,
    ],
  ];
  for (const [
    id,
    kind,
    model,
    mode,
    cond,
    price,
    rate,
    spec,
    battery,
    lat,
    lng,
    hub,
    deliv,
  ] of extra) {
    insVeh.run(
      id,
      kind,
      model,
      mode,
      "available",
      cond,
      price,
      rate,
      spec,
      battery,
      lat,
      lng,
      hub,
      "ok",
      deliv,
      `UMH:${id}`,
    );
  }

  // --- Historial de viajes completados + pago aprobado ---
  const insRes = db.prepare(
    `INSERT INTO reservations (id, user_id, vehicle_id, modality, address, status, requested_at, started_at, ended_at, total_cost_cop)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  const insPay = db.prepare(
    `INSERT INTO payments (id, owner_type, owner_id, kind, amount_cop, reference, status, reason, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  );
  const trips: [string, string, number, number, number][] = [
    // usuario, vehículo, tarifa/min, hace N días, minutos
    ["USRA-CLIENTE1", "SC-1042", 450, 6, 22],
    ["USRB-CLIENTE2", "BK-2201", 380, 5, 41],
    ["USRF-CLIENTE3", "SC-1088", 450, 4, 15],
    ["USRG-CLIENTE4", "SC-1120", 450, 3, 33],
    ["USRH-CLIENTE5", "BK-2244", 380, 2, 27],
    ["USRA-CLIENTE1", "SC-1150", 480, 1, 18],
  ];
  for (const [user, veh, rate, daysAgo, minutes] of trips) {
    const id = uid("RES");
    const start = now - daysAgo * DAY;
    const total = rate * minutes;
    insRes.run(
      id,
      user,
      veh,
      "hub",
      null,
      "completed",
      start - 5 * MIN,
      start,
      start + minutes * MIN,
      total,
    );
    insPay.run(
      uid("PAY"),
      "reservation",
      id,
      "base",
      5000,
      `DEMO-${id}`,
      "approved",
      null,
      start - 4 * MIN,
    );
    insPay.run(
      uid("PAY"),
      "reservation",
      id,
      "cargo_viaje",
      Math.max(0, total - 5000),
      `DEMO-${id}-C`,
      "approved",
      null,
      start + minutes * MIN,
    );
  }

  // --- Entregas a domicilio: una a tiempo, una tarde (dispara aviso de retraso) ---
  const insDel = db.prepare(
    `INSERT INTO deliveries (id, reservation_id, courier_id, status, deadline_at, assigned_at, delivered_at, reason)
     VALUES (?,?,?,?,?,?,?,?)`,
  );
  const mkDelivery = (
    user: string,
    veh: string,
    addr: string,
    courier: string,
    status: string,
    minsAgo: number,
    late: boolean,
  ) => {
    const resId = uid("RES");
    const t0 = now - minsAgo * MIN;
    insRes.run(
      resId,
      user,
      veh,
      "delivery",
      addr,
      status === "delivered" ? "completed" : "requested",
      t0,
      null,
      null,
      null,
    );
    const delId = uid("DEL");
    insDel.run(
      delId,
      resId,
      courier,
      status,
      t0 + 30 * MIN,
      t0 + MIN,
      status === "delivered" ? t0 + (late ? 42 : 24) * MIN : null,
      late ? "Tráfico en la Autopista a Floridablanca" : null,
    );
    return delId;
  };
  mkDelivery(
    "USRB-CLIENTE2",
    "DR-3301",
    "Cra 36 # 52-10, Cabecera",
    "USRD-DOMI1",
    "delivered",
    3 * 60,
    false,
  );
  const lateId = mkDelivery(
    "USRF-CLIENTE3",
    "BK-2260",
    "Calle 45 # 27-18, Centro",
    "USRE-DOMI2",
    "late",
    50,
    true,
  );
  mkDelivery(
    "USRH-CLIENTE5",
    "SC-1163",
    "Cra 27 # 9-41, UNAB",
    "USRI-DOMI3",
    "in_progress",
    12,
    false,
  );

  // --- Compra pagada (el vehículo pasa a "sold") ---
  const purchaseId = uid("PUR");
  db.prepare(
    "INSERT INTO purchases (id, user_id, vehicle_id, price_cop, payment_method, status, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?)",
  ).run(
    purchaseId,
    "USRG-CLIENTE4",
    "SV-5004",
    3_200_000,
    "card",
    "paid",
    now - 2 * DAY,
    now - 2 * DAY,
  );
  insPay.run(
    uid("PAY"),
    "purchase",
    purchaseId,
    "base",
    3_200_000,
    `DEMO-${purchaseId}`,
    "approved",
    null,
    now - 2 * DAY,
  );
  db.prepare("UPDATE vehicles SET status = 'sold' WHERE id = 'SV-5004'").run();

  // --- Alertas IoT recientes ---
  const insAlert = db.prepare(
    "INSERT INTO alert_log (id, vehicle_id, type, lat, lng, at, origin) VALUES (?,?,?,?,?,?,?)",
  );
  insAlert.run(
    uid("ALR"),
    "SC-1088",
    "no_helmet",
    7.1172,
    -73.1141,
    now - 3 * 60 * MIN,
    "telemetry",
  );
  insAlert.run(uid("ALR"), "BK-2244", "low_battery", 7.1119, -73.1088, now - 90 * MIN, "telemetry");
  insAlert.run(uid("ALR"), "DR-3315", "gps_lost", 7.1203, -73.1105, now - 40 * MIN, "simulator");
  insAlert.run(uid("ALR"), "SC-1120", "crash", 7.1155, -73.1199, now - 15 * MIN, "simulator");

  // --- Notificación del retraso (estado "simulated": el envío real lo hace Brevo al ocurrir) ---
  db.prepare(
    `INSERT INTO notifications (id, user_id, delivery_id, channel, provider, template, to_email, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    uid("NTF"),
    "USRF-CLIENTE3",
    lateId,
    "email",
    "brevo",
    "entrega_tardia",
    "cliente3@demo.co",
    "simulated",
    now - 8 * MIN,
  );
}
