import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { SEED_HUBS, SEED_VEHICLES } from "../../lib/data/mock";

/** Clave de cifrado para plantillas biométricas (prod: KMS/secret, no env suelto). */
function dataKey(): Buffer {
  const secret = process.env["UMH_DATA_KEY"] ?? "umh-demo-data-key-cambiar-en-produccion";
  return createHash("sha256").update(secret).digest();
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("base64");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "base64");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function uid(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString("hex")}`;
}

/**
 * Siembra mínima: misma flota y hubs que el mock de frontend (una sola fuente de
 * seeds), más los 4 usuarios de demo con contraseña `Demo1234!`.
 */
export function seedIfEmpty(db: DatabaseSync): void {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;

  const now = Date.now();
  const insHub = db.prepare(
    "INSERT INTO hubs (id, name, zone, lat, lng, capacity, charging, active) VALUES (?,?,?,?,?,?,?,?)",
  );
  for (const h of SEED_HUBS) {
    insHub.run(h.id, h.name, h.zone, h.lat, h.lng, h.capacity, h.charging, h.active ? 1 : 0);
  }

  const insVeh = db.prepare(
    `INSERT INTO vehicles (id, kind, model, mode, status, condition, price_cop, rate_per_min_cop,
      spec, battery, lat, lng, hub_id, alert_state, deliverable, qr_code)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const v of SEED_VEHICLES) {
    insVeh.run(
      v.id,
      v.kind,
      v.model,
      v.mode,
      "available",
      v.condition ?? null,
      v.price ?? null,
      v.pricePerMinute ?? null,
      v.spec,
      v.battery,
      v.lat,
      v.lng,
      v.hubId ?? null,
      "ok",
      v.delivery ? 1 : 0,
      `UMH:${v.id}`,
    );
  }

  const insUser = db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
  );
  const insConsent = db.prepare(
    "INSERT INTO consents (id, user_id, purpose, accepted_at, revoked) VALUES (?,?,?,?,0)",
  );
  const demoUsers: [string, string, string, string][] = [
    ["USRA-CLIENTE1", "Ana Cliente", "cliente@demo.co", "user"],
    ["USRB-CLIENTE2", "Beto Cliente", "cliente2@demo.co", "user"],
    ["USRO-OPERADOR", "Operador UMH", "operador@demo.co", "operator"],
    ["USRD-DOMI1", "Diana domiciliaria", "domi1@demo.co", "courier"],
    ["USRE-DOMI2", "Ernesto domiciliario", "domi2@demo.co", "courier"],
  ];
  for (const [id, name, email, role] of demoUsers) {
    insUser.run(id, name, email, hashPassword("Demo1234!"), role, now);
    insConsent.run(uid("CON"), id, "datos_personales", now);
  }
}

export { dataKey };
