import { getDb } from "./db";
import { uid } from "./db/seed";

/**
 * Repositorios: ÚNICOS que escriben SQL. Las funciones devuelven filas crudas de
 * SQLite (snake_case); `api/handlers.ts` decide qué ve el cliente. Así los nombres
 * de tabla de los diagramas (`vehicles`, `payments`, `deliveries`…) son literalmente
 * los de este archivo.
 */

export type VehicleRow = {
  id: string;
  kind: string;
  model: string;
  mode: string;
  status: string;
  condition: string | null;
  price_cop: number | null;
  rate_per_min_cop: number | null;
  spec: string;
  battery: number;
  lat: number;
  lng: number;
  hub_id: string | null;
  alert_state: string;
  deliverable: number;
  qr_code: string;
};
export type HubRow = VehiclelessHub;
type VehiclelessHub = {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  capacity: number;
  charging: number;
  active: number;
  occupied?: number;
};
export type ReservationRow = {
  id: string;
  user_id: string;
  vehicle_id: string;
  modality: string;
  address: string | null;
  status: string;
  requested_at: number;
  started_at: number | null;
  ended_at: number | null;
  total_cost_cop: number | null;
};
export type PurchaseRow = {
  id: string;
  user_id: string;
  vehicle_id: string;
  price_cop: number;
  payment_method: string;
  status: string;
  created_at: number;
  paid_at: number | null;
};
export type DeliveryRow = {
  id: string;
  reservation_id: string;
  courier_id: string;
  status: string;
  deadline_at: number;
  assigned_at: number;
  delivered_at: number | null;
  reason: string | null;
  address?: string | null;
  user_id?: string;
  customer_name?: string;
  customer_email?: string;
  vehicle_model?: string;
  pickup_hub_name?: string;
};
export type UnlockRow = {
  id: string;
  vehicle_id: string;
  reservation_id: string;
  step: string;
  reason: string | null;
  expires_at: number;
};
export type AlertRow = {
  id: string;
  vehicle_id: string;
  type: string;
  lat: number;
  lng: number;
  at: number;
  origin: string;
};
export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: number;
};

export type VehicleInput = {
  id: string;
  kind: string;
  model: string;
  mode: string;
  status?: string;
  condition?: string | null;
  price_cop?: number | null;
  rate_per_min_cop?: number | null;
  spec?: string;
  battery?: number;
  lat?: number;
  lng?: number;
  hub_id?: string | null;
  deliverable?: number | boolean;
  qr_code?: string;
};
export type HubInput = {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  capacity: number;
  charging?: number;
  active?: number | boolean;
};

type SqlArg = string | number | null | Uint8Array;
const rows = <T>(sql: string, ...args: SqlArg[]) =>
  getDb()
    .prepare(sql)
    .all(...args) as unknown as T[];
const row = <T>(sql: string, ...args: SqlArg[]) =>
  getDb()
    .prepare(sql)
    .get(...args) as unknown as T | undefined;
const run = (sql: string, ...args: SqlArg[]) =>
  getDb()
    .prepare(sql)
    .run(...args);

export const repos = {
  vehicles: {
    list(filter?: { mode?: string }): VehicleRow[] {
      return filter?.mode
        ? rows<VehicleRow>("SELECT * FROM vehicles WHERE mode = ?", filter.mode)
        : rows<VehicleRow>("SELECT * FROM vehicles");
    },
    byId(id: string): VehicleRow | undefined {
      return row<VehicleRow>("SELECT * FROM vehicles WHERE id = ?", id);
    },
    setStatus(id: string, status: string) {
      run("UPDATE vehicles SET status = ? WHERE id = ?", status, id);
    },
    save(v: VehicleInput): VehicleRow | undefined {
      const exists = row<{ id: string }>("SELECT id FROM vehicles WHERE id = ?", v.id);
      if (exists) {
        run(
          `UPDATE vehicles SET kind=?, model=?, mode=?, condition=?, price_cop=?,
           rate_per_min_cop=?, spec=?, hub_id=?, deliverable=? WHERE id=?`,
          v.kind,
          v.model,
          v.mode,
          v.condition ?? null,
          v.price_cop ?? null,
          v.rate_per_min_cop ?? null,
          v.spec ?? "",
          v.hub_id ?? null,
          v.deliverable ? 1 : 0,
          v.id,
        );
      } else {
        run(
          `INSERT INTO vehicles (id, kind, model, mode, status, condition, price_cop,
           rate_per_min_cop, spec, battery, lat, lng, hub_id, alert_state, deliverable, qr_code)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          v.id,
          v.kind,
          v.model,
          v.mode,
          v.status ?? "available",
          v.condition ?? null,
          v.price_cop ?? null,
          v.rate_per_min_cop ?? null,
          v.spec ?? "",
          v.battery ?? 100,
          v.lat ?? 7.1193,
          v.lng ?? -73.109,
          v.hub_id ?? null,
          "ok",
          v.deliverable ? 1 : 0,
          v.qr_code ?? `UMH:${v.id}`,
        );
      }
      return this.byId(v.id);
    },
    remove(id: string) {
      run("DELETE FROM vehicles WHERE id = ?", id);
    },
    updateLive(id: string, lat: number, lng: number, battery: number, alertState: string) {
      run(
        "UPDATE vehicles SET lat=?, lng=?, battery=?, alert_state=? WHERE id=?",
        lat,
        lng,
        battery,
        alertState,
        id,
      );
    },
  },

  hubs: {
    list(): HubRow[] {
      return rows<HubRow>(
        `SELECT h.*, COUNT(v.id) AS occupied FROM hubs h
         LEFT JOIN vehicles v ON v.hub_id = h.id GROUP BY h.id`,
      );
    },
    byId(id: string): HubRow | undefined {
      const h = row<Omit<HubRow, "occupied">>("SELECT * FROM hubs WHERE id = ?", id);
      if (!h) return undefined;
      const n = row<{ n: number }>("SELECT COUNT(*) AS n FROM vehicles WHERE hub_id = ?", id);
      return { ...h, occupied: n?.n ?? 0 };
    },
    vehicleCount(id: string): number {
      return row<{ n: number }>("SELECT COUNT(*) AS n FROM vehicles WHERE hub_id = ?", id)?.n ?? 0;
    },
    save(h: HubInput): HubRow | undefined {
      const exists = row<{ id: string }>("SELECT id FROM hubs WHERE id = ?", h.id);
      if (exists) {
        run(
          "UPDATE hubs SET name=?, zone=?, lat=?, lng=?, capacity=?, charging=?, active=? WHERE id=?",
          h.name,
          h.zone,
          h.lat,
          h.lng,
          h.capacity,
          h.charging ?? 0,
          h.active === false || h.active === 0 ? 0 : 1,
          h.id,
        );
      } else {
        run(
          "INSERT INTO hubs (id, name, zone, lat, lng, capacity, charging, active) VALUES (?,?,?,?,?,?,?,?)",
          h.id,
          h.name,
          h.zone,
          h.lat,
          h.lng,
          h.capacity,
          h.charging ?? 0,
          h.active === false || h.active === 0 ? 0 : 1,
        );
      }
      return this.byId(h.id);
    },
    remove(id: string) {
      run("DELETE FROM hubs WHERE id = ?", id);
    },
  },

  users: {
    byEmail(email: string): UserRow | undefined {
      return row<UserRow>("SELECT * FROM users WHERE email = ?", email);
    },
    byId(id: string): UserRow | undefined {
      return row<UserRow>("SELECT * FROM users WHERE id = ?", id);
    },
    create(input: { id: string; name: string; email: string; hash: string; role: string }) {
      run(
        "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
        input.id,
        input.name,
        input.email,
        input.hash,
        input.role,
        Date.now(),
      );
    },
    addConsent(userId: string, purpose: string) {
      run(
        "INSERT INTO consents (id, user_id, purpose, accepted_at, revoked) VALUES (?,?,?,?,0)",
        uid("CON"),
        userId,
        purpose,
        Date.now(),
      );
    },
    consentActive(userId: string, purpose: string): boolean {
      const r = row<{ n: number }>(
        "SELECT COUNT(*) AS n FROM consents WHERE user_id=? AND purpose=? AND revoked=0",
        userId,
        purpose,
      );
      return (r?.n ?? 0) > 0;
    },
    listCouriers() {
      return rows<{ id: string; name: string; email: string; load: number }>(
        `SELECT u.id, u.name, u.email,
           (SELECT COUNT(*) FROM deliveries d WHERE d.courier_id=u.id AND d.status IN ('assigned','in_progress','late')) AS load
         FROM users u WHERE u.role='courier'`,
      );
    },
    firstOperator(): UserRow | undefined {
      return row<UserRow>("SELECT * FROM users WHERE role='operator' LIMIT 1");
    },
    setFaceEnrolled(userId: string, enrolled: boolean) {
      if (enrolled) {
        run(
          `INSERT INTO biometric_templates (user_id, cipher_text, iv, auth_tag)
           VALUES (?,?,?,?)
           ON CONFLICT(user_id) DO UPDATE SET cipher_text=excluded.cipher_text`,
          userId,
          Buffer.from("plantilla-demo-no-biometria-real"),
          Buffer.from("iv-demo-12bytes"),
          Buffer.from("tag-demo"),
        );
      } else {
        run("DELETE FROM biometric_templates WHERE user_id = ?", userId);
      }
    },
    hasFace(userId: string): boolean {
      return (
        (row<{ n: number }>("SELECT COUNT(*) AS n FROM biometric_templates WHERE user_id=?", userId)
          ?.n ?? 0) > 0
      );
    },
  },

  reservations: {
    create(r: {
      id: string;
      user_id: string;
      vehicle_id: string;
      modality: string;
      address: string | null;
      status: string;
      requested_at: number;
    }) {
      run(
        `INSERT INTO reservations (id, user_id, vehicle_id, modality, address, status, requested_at)
         VALUES (?,?,?,?,?,?,?)`,
        r.id,
        r.user_id,
        r.vehicle_id,
        r.modality,
        r.address,
        r.status,
        r.requested_at,
      );
    },
    byId(id: string): ReservationRow | undefined {
      return row<ReservationRow>("SELECT * FROM reservations WHERE id = ?", id);
    },
    byUser(userId: string): ReservationRow[] {
      return rows<ReservationRow>(
        "SELECT * FROM reservations WHERE user_id = ? ORDER BY requested_at DESC",
        userId,
      );
    },
    pendingDeliveries() {
      return rows<
        ReservationRow & { vehicle_model: string; customer_name: string; customer_email: string }
      >(
        `SELECT r.*, v.model AS vehicle_model, u.name AS customer_name, u.email AS customer_email
         FROM reservations r
         JOIN vehicles v ON v.id = r.vehicle_id
         JOIN users u ON u.id = r.user_id
         WHERE r.modality='delivery' AND r.status='requested'`,
      );
    },
    setStatus(
      id: string,
      status: string,
      extra?: { started_at?: number; ended_at?: number; total_cost_cop?: number },
    ) {
      run(
        `UPDATE reservations SET status=?,
           started_at=COALESCE(?, started_at),
           ended_at=COALESCE(?, ended_at),
           total_cost_cop=COALESCE(?, total_cost_cop)
         WHERE id=?`,
        status,
        extra?.started_at ?? null,
        extra?.ended_at ?? null,
        extra?.total_cost_cop ?? null,
        id,
      );
    },
  },

  purchases: {
    create(p: {
      id: string;
      user_id: string;
      vehicle_id: string;
      price_cop: number | null;
      payment_method: string;
      status: string;
      created_at: number;
    }) {
      run(
        `INSERT INTO purchases (id, user_id, vehicle_id, price_cop, payment_method, status, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        p.id,
        p.user_id,
        p.vehicle_id,
        p.price_cop,
        p.payment_method,
        p.status,
        p.created_at,
      );
    },
    byId(id: string): PurchaseRow | undefined {
      return row<PurchaseRow>("SELECT * FROM purchases WHERE id = ?", id);
    },
    byUser(userId: string): PurchaseRow[] {
      return rows<PurchaseRow>(
        "SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC",
        userId,
      );
    },
    setStatus(id: string, status: string, paidAt?: number) {
      run(
        "UPDATE purchases SET status=?, paid_at=COALESCE(?, paid_at) WHERE id=?",
        status,
        paidAt ?? null,
        id,
      );
    },
  },

  payments: {
    create(p: {
      id: string;
      owner_type: string;
      owner_id: string;
      kind: string;
      amount_cop: number;
      reference: string | null;
      status: string;
      reason: string | null;
      created_at: number;
    }) {
      run(
        `INSERT INTO payments (id, owner_type, owner_id, kind, amount_cop, reference, status, reason, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        p.id,
        p.owner_type,
        p.owner_id,
        p.kind,
        p.amount_cop,
        p.reference,
        p.status,
        p.reason,
        p.created_at,
      );
    },
    byOwner(ownerType: string, ownerId: string) {
      return rows<Record<string, unknown>>(
        "SELECT * FROM payments WHERE owner_type=? AND owner_id=? ORDER BY created_at DESC",
        ownerType,
        ownerId,
      );
    },
  },

  deliveries: {
    create(d: {
      id: string;
      reservation_id: string;
      courier_id: string;
      status: string;
      deadline_at: number;
      assigned_at: number;
    }) {
      run(
        `INSERT INTO deliveries (id, reservation_id, courier_id, status, deadline_at, assigned_at)
         VALUES (?,?,?,?,?,?)`,
        d.id,
        d.reservation_id,
        d.courier_id,
        d.status,
        d.deadline_at,
        d.assigned_at,
      );
    },
    byId(id: string): DeliveryRow | undefined {
      return row<DeliveryRow>("SELECT * FROM deliveries WHERE id = ?", id);
    },
    activeForReservation(reservationId: string): DeliveryRow | undefined {
      return row<DeliveryRow>(
        `SELECT * FROM deliveries WHERE reservation_id=? AND status IN ('assigned','in_progress','late') LIMIT 1`,
        reservationId,
      );
    },
    list(filter: { courierId?: string; status?: string[] }): DeliveryRow[] {
      const where: string[] = [];
      const args: (string | number | null)[] = [];
      if (filter.courierId) {
        where.push("d.courier_id = ?");
        args.push(filter.courierId);
      }
      if (filter.status?.length) {
        where.push(`d.status IN (${filter.status.map(() => "?").join(",")})`);
        args.push(...filter.status);
      }
      return rows<DeliveryRow>(
        `SELECT d.*, r.address, r.user_id, cu.name AS customer_name, cu.email AS customer_email,
           v.model AS vehicle_model, h.name AS pickup_hub_name
         FROM deliveries d
         JOIN reservations r ON r.id = d.reservation_id
         JOIN vehicles v ON v.id = r.vehicle_id
         JOIN users cu ON cu.id = r.user_id
         LEFT JOIN hubs h ON h.id = v.hub_id
         ${where.length ? "WHERE " + where.join(" AND ") : ""}
         ORDER BY d.deadline_at ASC`,
        ...args,
      );
    },
    update(id: string, patch: { status?: string; reason?: string; delivered_at?: number }) {
      run(
        `UPDATE deliveries SET status=COALESCE(?, status), reason=COALESCE(?, reason),
         delivered_at=COALESCE(?, delivered_at) WHERE id=?`,
        patch.status ?? null,
        patch.reason ?? null,
        patch.delivered_at ?? null,
        id,
      );
    },
    overdue(): DeliveryRow[] {
      return rows<DeliveryRow>(
        "SELECT * FROM deliveries WHERE status IN ('assigned','in_progress') AND deadline_at < ?",
        Date.now(),
      );
    },
  },

  unlock: {
    create(s: {
      id: string;
      vehicle_id: string;
      reservation_id: string;
      step: string;
      expires_at: number;
    }) {
      run(
        "INSERT INTO unlock_sessions (id, vehicle_id, reservation_id, step, expires_at) VALUES (?,?,?,?,?)",
        s.id,
        s.vehicle_id,
        s.reservation_id,
        s.step,
        s.expires_at,
      );
    },
    byId(id: string): UnlockRow | undefined {
      return row<UnlockRow>("SELECT * FROM unlock_sessions WHERE id = ?", id);
    },
    setStep(id: string, step: string, reason?: string) {
      run(
        "UPDATE unlock_sessions SET step=?, reason=COALESCE(?, reason) WHERE id=?",
        step,
        reason ?? null,
        id,
      );
    },
  },

  alerts: {
    insert(a: {
      id: string;
      vehicle_id: string;
      type: string;
      lat: number;
      lng: number;
      at: number;
      origin: string;
    }) {
      run(
        "INSERT INTO alert_log (id, vehicle_id, type, lat, lng, at, origin) VALUES (?,?,?,?,?,?,?)",
        a.id,
        a.vehicle_id,
        a.type,
        a.lat,
        a.lng,
        a.at,
        a.origin,
      );
    },
    list(limit = 200): AlertRow[] {
      return rows<AlertRow>("SELECT * FROM alert_log ORDER BY at DESC LIMIT ?", limit);
    },
  },

  notifications: {
    /** Devuelve el id nuevo o null si ya existía (UNIQUE: una notificación por entrega+plantilla+usuario). */
    ensure(d: {
      userId: string;
      deliveryId: string;
      template: string;
      toEmail: string;
    }): string | null {
      const id = uid("NOT");
      try {
        run(
          `INSERT INTO notifications (id, user_id, delivery_id, channel, provider, template, to_email, status, created_at)
           VALUES (?,?,?,'email','brevo',?,?, 'queued', ?)`,
          id,
          d.userId,
          d.deliveryId,
          d.template,
          d.toEmail,
          Date.now(),
        );
        return id;
      } catch {
        return null;
      }
    },
    setStatus(id: string, status: string, providerId?: string, error?: string) {
      run(
        "UPDATE notifications SET status=?, provider_id=COALESCE(?, provider_id), error=COALESCE(?, error) WHERE id=?",
        status,
        providerId ?? null,
        error ?? null,
        id,
      );
    },
    list(limit = 100) {
      return rows<Record<string, unknown>>(
        "SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?",
        limit,
      );
    },
  },

  stats: {
    kpis() {
      const one = <T>(sql: string, ...args: (string | number | null)[]) => row<T>(sql, ...args);
      return {
        connectedVehicles:
          one<{ n: number }>("SELECT COUNT(*) AS n FROM vehicles WHERE status != 'offline'")?.n ??
          0,
        activeHubs: one<{ n: number }>("SELECT COUNT(*) AS n FROM hubs WHERE active=1")?.n ?? 0,
        averageBattery:
          one<{ a: number }>(
            "SELECT ROUND(AVG(battery)) AS a FROM vehicles WHERE mode='rent' AND status != 'offline'",
          )?.a ?? 0,
        activeAlerts:
          one<{ n: number }>("SELECT COUNT(*) AS n FROM vehicles WHERE alert_state != 'ok'")?.n ??
          0,
      };
    },
  },
};
