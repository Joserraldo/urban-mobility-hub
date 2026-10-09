import {
  createUnlockSession,
  scanQr,
  verifyHelmet,
  verifyFace,
  canStartTrip,
  type UnlockSession as DomainSession,
} from "../domain/unlock";
import { transition, rentalCost } from "../domain/reservations";
import type { Telemetry } from "../domain/alerts";
import { getDb } from "../db";
import { hashPassword, uid, verifyPassword } from "../db/seed";
import {
  repos,
  type AlertRow,
  type DeliveryRow,
  type HubRow,
  type PurchaseRow,
  type ReservationRow,
  type UnlockRow,
  type UserRow,
  type VehicleRow,
} from "../repositories";
import {
  clearSessionCookie,
  createSession,
  httpError,
  readSessionUser,
  requireRole,
  requireUser,
  sessionCookie,
  type SessionUser,
} from "../services/sessions";
import { getGateway } from "../services/pasarela";
import { applyTelemetry, markLate } from "../services/fleet-sim";
import { stream } from "../services/stream";

const ALERT_OUT: Record<string, string> = {
  ok: "ok",
  no_helmet: "no-helmet",
  crash: "crash",
  gps_lost: "gps-lost",
  low_battery: "low-battery",
};

const BASE_PREPAY_COP = 10_000;

// ---------- payloads tipados ----------
type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
  consent?: boolean;
  biometric?: boolean;
};
type LoginBody = { email?: string; password?: string };
type FaceBody = { enrolled?: boolean };
type PurchaseBody = { vehicleId?: string };
type PaymentBody = { ownerType?: string; ownerId?: string; method?: string };
type ReservationBody = { vehicleId?: string; modality?: string; address?: string };
type UnlockCreateBody = { vehicleId?: string; reservationId?: string };
type QrBody = { code?: string };
type HelmetBody = { helmetDetected?: boolean; confidence?: number };
type FaceScoreBody = { score?: number };
type IngestBody = {
  vehicleId?: string;
  ts?: number;
  lat?: number;
  lng?: number;
  battery?: number;
  speedKmh?: number;
  helmetOn?: boolean;
  impactG?: number;
  gpsFixAgeMs?: number;
  tripActive?: boolean;
};
type SimulateBody = { vehicleId?: string; type?: string };
type VehicleBody = {
  id?: string;
  kind?: string;
  model?: string;
  mode?: string;
  condition?: string | null;
  price_cop?: number | null;
  rate_per_min_cop?: number | null;
  spec?: string;
  hub_id?: string | null;
  deliverable?: number | boolean;
};
type HubBody = {
  id?: string;
  name?: string;
  zone?: string;
  lat?: number;
  lng?: number;
  capacity?: number;
  charging?: number;
  active?: number | boolean;
};
type DeliveryCreateBody = { reservationId?: string; courierId?: string; deadlineMinutes?: number };
type DeliveryPatchBody = { action?: string; reason?: string };

function ok(data: unknown, init?: { status?: number; headers?: HeadersInit }): Response {
  const r: ResponseInit = {};
  if (init?.status !== undefined) r.status = init.status;
  if (init?.headers !== undefined) r.headers = init.headers;
  return Response.json(data, r);
}

async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Router REST del backend de desarrollo. Cada ruta toca las tablas que aparecen
 * en las secuencias PlantUML (entregables/diseno/src) y en docs/api/openapi.yaml
 * (contrato-first, RNF-10).
 */
export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // ---------- system ----------
    if (method === "GET" && path === "/api/health") {
      return ok({ ok: true, source: "sqlite", db: process.env["UMH_DB_PATH"] ?? "data/umh.db" });
    }

    if (method === "GET" && path === "/api/stream") {
      return sse();
    }

    // ---------- auth (UC01/UC02) ----------
    if (method === "POST" && path === "/api/auth/register") {
      const b = await body<RegisterBody>(request);
      if (!b.consent) throw httpError(422, "Debes aceptar el tratamiento de datos (Ley 1581)");
      const email = String(b.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(b.password ?? "");
      if (!email.includes("@") || password.length < 8)
        throw httpError(422, "Correo inválido o contraseña de menos de 8 caracteres");
      if (repos.users.byEmail(email)) throw httpError(409, "Ese correo ya está registrado");
      const id = uid("USR");
      repos.users.create({
        id,
        name: String(b.name ?? "Cliente").trim(),
        email,
        hash: hashPassword(password),
        role: "user",
      });
      repos.users.addConsent(id, "datos_personales");
      if (b.biometric) repos.users.addConsent(id, "biometria");
      const user = publicUser(repos.users.byEmail(email) as UserRow);
      return ok(user, { headers: { "set-cookie": sessionCookie(tokenFor(user)) } });
    }

    if (method === "POST" && path === "/api/auth/login") {
      const b = await body<LoginBody>(request);
      const row = repos.users.byEmail(
        String(b.email ?? "")
          .trim()
          .toLowerCase(),
      ) as UserRow | undefined;
      const good = row && verifyPassword(String(b.password ?? ""), row.password_hash);
      if (!good || !row) throw httpError(401, "Correo o contraseña incorrectos"); // genérico: no revela
      const user = publicUser(row);
      return ok(user, { headers: { "set-cookie": sessionCookie(tokenFor(user)) } });
    }

    if (method === "POST" && path === "/api/auth/logout") {
      return ok({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
    }

    if (method === "GET" && path === "/api/auth/me") {
      const u = readSessionUser(request);
      if (!u) return ok(null);
      const row = repos.users.byEmail(u.email) as UserRow | undefined;
      return ok(row ? publicUser(row) : null);
    }

    // RF-22: enrolar/borrar plantilla biométrica (la imagen nunca se sube)
    if (method === "POST" && path === "/api/auth/face") {
      const u = requireUser(request);
      const b = await body<FaceBody>(request);
      if (!repos.users.consentActive(u.id, "biometria"))
        throw httpError(422, "Falta el consentimiento biométrico explícito (RF-20/RF-22)");
      repos.users.setFaceEnrolled(u.id, b.enrolled ?? true);
      return ok(publicUser(repos.users.byEmail(u.email) as UserRow));
    }

    // ---------- catálogo y flota (UC03/UC06/UC07) ----------
    if (method === "GET" && path === "/api/vehicles") {
      const mode = url.searchParams.get("mode");
      return ok(repos.vehicles.list(mode ? { mode } : undefined).map(toClientVehicle));
    }
    const vehicleMatch = path.match(/^\/api\/vehicles\/([^/]+)$/);
    if (method === "GET" && vehicleMatch?.[1]) {
      const v = repos.vehicles.byId(vehicleMatch[1]);
      if (!v) throw httpError(404, "Vehículo no encontrado");
      return ok(toClientVehicle(v));
    }
    if (method === "GET" && path === "/api/hubs") return ok(repos.hubs.list().map(toClientHub));
    const hubMatch = path.match(/^\/api\/hubs\/([^/]+)$/);
    if (method === "GET" && hubMatch?.[1]) {
      const h = repos.hubs.byId(hubMatch[1]);
      if (!h) throw httpError(404, "Hub no encontrado");
      return ok(toClientHub(h));
    }

    // ---------- compras y pagos (UC04/UC18) ----------
    if (method === "POST" && path === "/api/purchases") {
      const u = requireUser(request);
      const b = await body<PurchaseBody>(request);
      const v = repos.vehicles.byId(String(b.vehicleId)) as VehicleRow | undefined;
      if (!v || v.mode !== "sale" || v.status !== "available")
        throw httpError(409, "Ese vehículo ya no está disponible para la venta");
      const p = {
        id: uid("PUR"),
        user_id: u.id,
        vehicle_id: v.id,
        price_cop: v.price_cop,
        payment_method: "card",
        status: "pending",
        created_at: Date.now(),
      };
      repos.purchases.create(p);
      return ok({ purchase: p }, { status: 201 });
    }

    if (method === "GET" && path === "/api/purchases") {
      const u = requireUser(request);
      return ok(repos.purchases.byUser(u.id));
    }

    if (method === "POST" && path === "/api/payments") {
      const u = requireUser(request);
      const b = await body<PaymentBody>(request);
      if (b.ownerType === "purchase") return await payPurchase(u, String(b.ownerId));
      if (b.ownerType === "reservation") return await payReservation(u, String(b.ownerId));
      throw httpError(422, "ownerType debe ser purchase|reservation");
    }

    // ---------- reservas (UC05) ----------
    if (method === "POST" && path === "/api/reservations") {
      const u = requireUser(request);
      const b = await body<ReservationBody>(request);
      const v = repos.vehicles.byId(String(b.vehicleId)) as VehicleRow | undefined;
      if (!v || v.mode !== "rent" || v.status !== "available")
        throw httpError(409, "Ese vehículo no está disponible para alquiler");
      const modality = String(b.modality ?? "hub");
      if (!["hub", "delivery"].includes(modality))
        throw httpError(422, "modality debe ser hub|delivery");
      if (modality === "delivery" && !String(b.address ?? "").trim())
        throw httpError(422, "Para domicilio necesitas una dirección");
      const r = {
        id: uid("RES"),
        user_id: u.id,
        vehicle_id: v.id,
        modality,
        address: b.address ?? null,
        status: "requested",
        requested_at: Date.now(),
      };
      repos.reservations.create(r);
      return ok({ reservation: r, prepayCop: BASE_PREPAY_COP }, { status: 201 });
    }

    if (method === "GET" && path === "/api/reservations") {
      const u = requireUser(request);
      const mine = repos.reservations.byUser(u.id) as ReservationRow[];
      return ok(
        mine.map((r) => ({ ...r, delivery: repos.deliveries.activeForReservation(r.id) ?? null })),
      );
    }

    const cancelMatch = path.match(/^\/api\/reservations\/([^/]+)\/cancel$/);
    if (method === "POST" && cancelMatch?.[1]) {
      const u = requireUser(request);
      const r = repos.reservations.byId(cancelMatch[1]) as ReservationRow | undefined;
      if (!r || r.user_id !== u.id) throw httpError(404, "Reserva no encontrada");
      const next = transition({ status: r.status as never }, "cancel");
      repos.reservations.setStatus(r.id, next.status);
      if (r.status !== "active") repos.vehicles.setStatus(r.vehicle_id, "available");
      return ok(repos.reservations.byId(r.id));
    }

    const endMatch = path.match(/^\/api\/trips\/([^/]+)\/end$/);
    if (method === "POST" && endMatch?.[1]) {
      const u = requireUser(request);
      const r = repos.reservations.byId(endMatch[1]) as ReservationRow | undefined;
      if (!r || r.user_id !== u.id || r.status !== "active")
        throw httpError(404, "No hay un viaje activo que cerrar");
      const v = repos.vehicles.byId(r.vehicle_id) as VehicleRow | undefined;
      if (!v) throw httpError(404, "Vehículo no encontrado");
      const minutes = Math.max(1, (Date.now() - Number(r.started_at)) / 60_000);
      const total = rentalCost(minutes, v.rate_per_min_cop ?? 500);
      const result = await getGateway().charge({ amountCop: total, method: "card" });
      repos.payments.create({
        id: uid("PAY"),
        owner_type: "reservation",
        owner_id: r.id,
        kind: "cargo_viaje",
        amount_cop: total,
        reference: result.reference ?? null,
        status: result.status,
        reason: result.reason ?? null,
        created_at: Date.now(),
      });
      if (result.status === "rejected")
        throw httpError(
          402,
          `El cobro del viaje fue rechazado (${result.reason ?? "?"}). Intenta de nuevo.`,
        );
      repos.reservations.setStatus(r.id, "completed", {
        ended_at: Date.now(),
        total_cost_cop: total,
      });
      if (r.modality !== "delivery") repos.vehicles.setStatus(r.vehicle_id, "available");
      return ok({
        reservation: repos.reservations.byId(r.id),
        total,
        reference: result.reference ?? null,
      });
    }

    // ---------- desbloqueo (UC08/UC09) ----------
    if (method === "POST" && path === "/api/unlock/sessions") {
      const u = requireUser(request);
      const b = await body<UnlockCreateBody>(request);
      const r = repos.reservations.byId(String(b.reservationId)) as ReservationRow | undefined;
      if (!r || r.user_id !== u.id || r.status !== "requested")
        throw httpError(409, "Necesitas una reserva 'requested' para desbloquear");
      const session = createUnlockSession(String(b.vehicleId ?? r.vehicle_id));
      repos.unlock.create({
        id: session.id,
        vehicle_id: session.vehicleId,
        reservation_id: r.id,
        step: session.step,
        expires_at: session.expiresAt,
      });
      return ok(session, { status: 201 });
    }

    const unlockMatch = path.match(/^\/api\/unlock\/sessions\/([^/]+)\/(qr|helmet|face|start)$/);
    if (method === "POST" && unlockMatch?.[1] && unlockMatch[2]) {
      const u = requireUser(request);
      const sid = unlockMatch[1];
      const action = unlockMatch[2];
      const row = repos.unlock.byId(sid) as UnlockRow | undefined;
      if (!row) throw httpError(404, "Sesión de desbloqueo no encontrada");
      const reservation = repos.reservations.byId(row.reservation_id) as ReservationRow | undefined;
      if (!reservation || reservation.user_id !== u.id)
        throw httpError(403, "Esta sesión no es tuya");
      const now = Date.now();
      const session: DomainSession = {
        id: row.id,
        vehicleId: row.vehicle_id,
        step: row.step as DomainSession["step"],
        expiresAt: row.expires_at,
        ...(row.reason !== null ? { reason: row.reason } : {}),
      };

      let updated: DomainSession;
      if (action === "qr") {
        const b = await body<QrBody>(request);
        updated = scanQr(session, String(b.code ?? ""), now);
      } else if (action === "helmet") {
        const b = await body<HelmetBody>(request);
        updated = verifyHelmet(
          session,
          { helmetDetected: Boolean(b.helmetDetected), confidence: Number(b.confidence ?? 0) },
          now,
        );
      } else if (action === "face") {
        const b = await body<FaceScoreBody>(request);
        updated = verifyFace(
          session,
          {
            score: Number(b.score ?? 0),
            registered: repos.users.hasFace(u.id),
            consent: repos.users.consentActive(u.id, "biometria"),
          },
          now,
        );
      } else {
        if (!canStartTrip(session, now))
          throw httpError(409, `No se puede iniciar el viaje (paso '${session.step}')`);
        const next = transition({ status: reservation.status as never }, "start");
        repos.reservations.setStatus(reservation.id, next.status, { started_at: now });
        repos.vehicles.setStatus(session.vehicleId, "in_use");
        stream.emit("vehicle", { vehicleId: session.vehicleId, status: "in_use" });
        return ok({
          reservation: repos.reservations.byId(reservation.id),
          session: { ...session, step: "ready" },
        });
      }

      repos.unlock.setStep(sid, updated.step, updated.reason);
      if (updated.step === "denied" || updated.step === "expired")
        return ok(updated, { status: 400 });
      return ok(updated);
    }

    // ---------- telemetría y alertas (UC20/UC11/UC12) ----------
    if (method === "POST" && path === "/api/ingest") {
      const b = await body<IngestBody & { kind?: string; type?: string }>(request);
      if (b.kind === "alert" && b.vehicleId && b.type) {
        // alerta directa (contrato OpenAPI): se sintetiza la muestra que la produciría
        const ALERT_TO_SAMPLE: Record<string, Partial<Telemetry>> = {
          crash: { impactG: 6 },
          "no-helmet": { tripActive: true, helmetOn: false },
          "gps-lost": { gpsFixAgeMs: 30_000 },
          "low-battery": { battery: 5 },
        };
        const tAlert: Telemetry = {
          vehicleId: b.vehicleId,
          ts: Number(b.ts ?? Date.now()),
          lat: Number(b.lat ?? 0),
          lng: Number(b.lng ?? 0),
          battery: 100,
          speedKmh: 0,
          helmetOn: true,
          impactG: 1,
          gpsFixAgeMs: 0,
          tripActive: false,
          ...(ALERT_TO_SAMPLE[b.type] ?? {}),
        };
        applyTelemetry(tAlert, "telemetry");
        return ok({ accepted: true }, { status: 202 });
      }
      const t: Telemetry = {
        vehicleId: String(b.vehicleId ?? ""),
        ts: Number(b.ts ?? Date.now()),
        lat: Number(b.lat ?? 0),
        lng: Number(b.lng ?? 0),
        battery: Number(b.battery ?? 100),
        speedKmh: Number(b.speedKmh ?? 0),
        helmetOn: Boolean(b.helmetOn),
        impactG: Number(b.impactG ?? 1),
        gpsFixAgeMs: Number(b.gpsFixAgeMs ?? 0),
        tripActive: Boolean(b.tripActive),
      };
      applyTelemetry(t, "telemetry");
      return ok({ accepted: true }, { status: 202 });
    }

    if (method === "GET" && path === "/api/alerts") {
      return ok(repos.alerts.list().map(toClientAlert));
    }

    if (method === "POST" && path === "/api/admin/simulate-alert") {
      requireRole(request, "operator");
      const b = await body<SimulateBody>(request);
      const v = repos.vehicles.byId(String(b.vehicleId)) as VehicleRow | undefined;
      if (!v) throw httpError(404, "Vehículo no encontrado");
      const type = String(b.type ?? "crash");
      const t: Telemetry = {
        vehicleId: v.id,
        ts: Date.now(),
        lat: v.lat,
        lng: v.lng,
        battery: type === "low-battery" ? 5 : v.battery,
        speedKmh: 15,
        helmetOn: type !== "no-helmet",
        impactG: type === "crash" ? 6 : 1,
        gpsFixAgeMs: type === "gps-lost" ? 30_000 : 500,
        tripActive: type === "no-helmet",
      };
      applyTelemetry(t, "simulator");
      const created = (repos.alerts.list(20) as AlertRow[]).find((a) => a.vehicle_id === v.id);
      return ok(created ? toClientAlert(created) : null);
    }

    const clearMatch = path.match(/^\/api\/admin\/alerts\/([^/]+)\/clear$/);
    if (method === "POST" && clearMatch?.[1]) {
      requireRole(request, "operator");
      const real = getDb()
        .prepare("SELECT lat, lng, battery FROM vehicles WHERE id=?")
        .get(clearMatch[1]) as { lat: number; lng: number; battery: number } | undefined;
      if (!real) throw httpError(404, "Vehículo no encontrado");
      repos.vehicles.updateLive(clearMatch[1], real.lat, real.lng, real.battery, "ok");
      return ok({ ok: true });
    }

    // ---------- gestión operador (UC10/UC13) ----------
    if (method === "GET" && path === "/api/admin/kpis") {
      requireRole(request, "operator");
      return ok(repos.stats.kpis());
    }

    if (method === "POST" && path === "/api/admin/vehicles") {
      requireRole(request, "operator");
      const b = await body<VehicleBody>(request);
      const id = String(b.id ?? uid("VEH"));
      const saved = repos.vehicles.save({
        id,
        kind: String(b.kind ?? "scooter"),
        model: String(b.model ?? "Modelo UMH"),
        mode: String(b.mode ?? "rent"),
        condition: b.condition ?? null,
        price_cop: b.price_cop ?? null,
        rate_per_min_cop: b.rate_per_min_cop ?? null,
        spec: b.spec ?? "",
        hub_id: b.hub_id ?? null,
        deliverable: b.deliverable ?? 0,
      });
      if (!saved) throw httpError(500, "No se pudo guardar el vehículo");
      return ok(toClientVehicle(saved));
    }
    const adminVehicleDelete = path.match(/^\/api\/admin\/vehicles\/([^/]+)$/);
    if (method === "DELETE" && adminVehicleDelete?.[1]) {
      requireRole(request, "operator");
      repos.vehicles.remove(adminVehicleDelete[1]);
      return ok({ ok: true });
    }
    if (method === "POST" && path === "/api/admin/hubs") {
      requireRole(request, "operator");
      const b = await body<HubBody>(request);
      const saved = repos.hubs.save({
        id: String(b.id ?? uid("HUB")),
        name: String(b.name ?? "Hub UMH"),
        zone: String(b.zone ?? "Cabecera del Llano"),
        lat: Number(b.lat ?? 7.1193),
        lng: Number(b.lng ?? -73.109),
        capacity: Number(b.capacity ?? 20),
        charging: b.charging ?? 0,
        active: b.active ?? 1,
      });
      if (!saved) throw httpError(500, "No se pudo guardar el hub");
      return ok(toClientHub(saved));
    }
    const adminHubDelete = path.match(/^\/api\/admin\/hubs\/([^/]+)$/);
    if (method === "DELETE" && adminHubDelete?.[1]) {
      requireRole(request, "operator");
      if (repos.hubs.vehicleCount(adminHubDelete[1]) > 0)
        throw httpError(409, "No puedes dar de baja un hub con vehículos asignados (RF-24)");
      repos.hubs.remove(adminHubDelete[1]);
      return ok({ ok: true });
    }

    // ---------- entregas (UC14-UC17) ----------
    if (method === "GET" && path === "/api/couriers") {
      requireRole(request, "operator");
      return ok(repos.users.listCouriers());
    }
    if (method === "GET" && path === "/api/pending-deliveries") {
      requireRole(request, "operator");
      return ok(repos.reservations.pendingDeliveries());
    }
    if (method === "POST" && path === "/api/deliveries") {
      requireRole(request, "operator");
      const b = await body<DeliveryCreateBody>(request);
      const r = repos.reservations.byId(String(b.reservationId)) as ReservationRow | undefined;
      if (!r || r.modality !== "delivery")
        throw httpError(404, "Reserva de domicilio no encontrada");
      if (repos.deliveries.activeForReservation(r.id))
        throw httpError(409, "Esta reserva ya tiene una entrega en curso (UC14 E1)");
      const courier = getDb()
        .prepare("SELECT id, role FROM users WHERE id=?")
        .get(String(b.courierId)) as { id: string; role: string } | undefined;
      if (!courier || courier.role !== "courier")
        throw httpError(422, "El destinatario debe ser un domiciliario");
      const minutes = Number(b.deadlineMinutes ?? 45);
      const d = {
        id: uid("DEL"),
        reservation_id: r.id,
        courier_id: courier.id,
        status: "assigned",
        deadline_at: Date.now() + minutes * 60_000,
        assigned_at: Date.now(),
      };
      repos.deliveries.create(d);
      stream.emit("notification", { deliveryId: d.id, event: "assigned" });
      return ok({ delivery: d, deadlineMinutes: minutes }, { status: 201 });
    }
    if (method === "GET" && path === "/api/deliveries") {
      const u = requireUser(request);
      if (u.role === "courier") return ok(repos.deliveries.list({ courierId: u.id }));
      const scope = url.searchParams.get("scope");
      if (scope === "all") {
        requireRole(request, "operator");
        return ok(repos.deliveries.list({}));
      }
      const mine = (repos.deliveries.list({}) as (DeliveryRow & { user_id: string })[]).filter(
        (d) => d.user_id === u.id,
      );
      return ok(mine);
    }
    const deliveryPatch = path.match(/^\/api\/deliveries\/([^/]+)$/);
    // PATCH canónico; POST se acepta como alias para clientes sin soporte PATCH (demo/e2e).
    if (
      (method === "PATCH" || method === "POST") &&
      deliveryPatch?.[1] &&
      !path.endsWith("/complete")
    ) {
      const u = requireUser(request);
      const b = await body<DeliveryPatchBody>(request);
      const d = repos.deliveries.byId(deliveryPatch[1]) as DeliveryRow | undefined;
      if (!d) throw httpError(404, "Entrega no encontrada");
      if (u.role === "courier" && d.courier_id !== u.id)
        throw httpError(403, "Solo tu entrega (UC16 E2)");
      const action = String(b.action ?? "");
      if (action === "start") {
        if (d.status !== "assigned")
          throw httpError(409, `Transición inválida desde '${d.status}'`);
        repos.deliveries.update(d.id, { status: "in_progress" });
      } else if (action === "deliver") {
        if (d.status !== "in_progress" && d.status !== "late")
          throw httpError(409, `No puedes entregar desde '${d.status}'`);
        if (d.status === "late" && !String(b.reason ?? "").trim() && u.role === "courier")
          throw httpError(422, "Una entrega tardía se confirma con justificación (UC16 E3)");
        repos.deliveries.update(d.id, { status: "delivered", delivered_at: Date.now() });
        const r = repos.reservations.byId(d.reservation_id) as ReservationRow | undefined;
        if (r) {
          repos.reservations.setStatus(r.id, "active", { started_at: Date.now() });
          repos.reservations.setStatus(r.id, "completed", { ended_at: Date.now() });
          repos.vehicles.setStatus(r.vehicle_id, "in_use");
        }
      } else if (action === "late") {
        if (d.status === "delivered") throw httpError(409, "Entrega ya completada");
        markLate(d.id, String(b.reason ?? "marcada tardía por el domiciliario"));
      } else {
        throw httpError(422, "action debe ser start|deliver|late");
      }
      return ok(repos.deliveries.byId(d.id));
    }

    if (method === "GET" && path === "/api/notifications") {
      requireRole(request, "operator");
      return ok(repos.notifications.list());
    }

    return Response.json(
      { error: { code: "not_found", message: `Ruta no documentada: ${method} ${path}` } },
      { status: 404 },
    );
  } catch (error) {
    const e = error as { status?: number; message?: string };
    const status = e.status ?? 500;
    const code =
      status === 401
        ? "unauthorized"
        : status === 403
          ? "forbidden"
          : status === 409
            ? "conflict"
            : status === 404
              ? "not_found"
              : status === 422 || status === 402
                ? "validation"
                : "unknown";
    return Response.json({ error: { code, message: e.message ?? "Error interno" } }, { status });
  }
}

// ---------- helpers ----------

function publicUser(row: UserRow) {
  const consent = getDb()
    .prepare(
      "SELECT accepted_at FROM consents WHERE user_id=? AND purpose='datos_personales' AND revoked=0 LIMIT 1",
    )
    .get(row.id) as { accepted_at: number } | undefined;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    consentAt: consent?.accepted_at ?? 0,
    faceEnrolled: repos.users.hasFace(row.id),
  };
}

function tokenFor(u: { id: string; name: string; email: string; role: string }) {
  return createSession(u as SessionUser);
}

async function payPurchase(u: { id: string }, purchaseId: string): Promise<Response> {
  const p = repos.purchases.byId(purchaseId) as PurchaseRow | undefined;
  if (!p || p.user_id !== u.id) throw httpError(404, "Compra no encontrada");
  if (p.status !== "pending") throw httpError(409, "Esta compra ya fue procesada");
  const result = await getGateway().charge({ amountCop: p.price_cop, method: "card" });
  repos.payments.create({
    id: uid("PAY"),
    owner_type: "purchase",
    owner_id: p.id,
    kind: "base",
    amount_cop: p.price_cop,
    reference: result.reference ?? null,
    status: result.status,
    reason: result.reason ?? null,
    created_at: Date.now(),
  });
  if (result.status === "rejected") {
    repos.purchases.setStatus(p.id, "failed");
    throw httpError(402, `Pago rechazado: ${result.reason ?? "motivo no informado"}`);
  }
  repos.purchases.setStatus(p.id, "paid", Date.now());
  repos.vehicles.setStatus(p.vehicle_id, "sold");
  return ok({ purchase: repos.purchases.byId(p.id), reference: result.reference ?? null });
}

async function payReservation(u: { id: string }, reservationId: string): Promise<Response> {
  const r = repos.reservations.byId(reservationId) as ReservationRow | undefined;
  if (!r || r.user_id !== u.id) throw httpError(404, "Reserva no encontrada");
  if (r.status !== "requested") throw httpError(409, "La reserva ya está pagada o cerrada");
  const result = await getGateway().charge({ amountCop: BASE_PREPAY_COP, method: "card" });
  repos.payments.create({
    id: uid("PAY"),
    owner_type: "reservation",
    owner_id: r.id,
    kind: "base",
    amount_cop: BASE_PREPAY_COP,
    reference: result.reference ?? null,
    status: result.status,
    reason: result.reason ?? null,
    created_at: Date.now(),
  });
  if (result.status === "rejected") throw httpError(402, `Pago rechazado: ${result.reason ?? "?"}`);
  repos.vehicles.setStatus(r.vehicle_id, "reserved");
  return ok({ reservation: r, prepayCop: BASE_PREPAY_COP, reference: result.reference ?? null });
}

function toClientVehicle(v: VehicleRow) {
  return {
    id: v.id,
    kind: v.kind,
    model: v.model,
    mode: v.mode,
    status: v.status,
    condition: v.condition ?? undefined,
    price: v.price_cop ?? undefined,
    pricePerMinute: v.rate_per_min_cop ?? undefined,
    spec: v.spec,
    battery: v.battery,
    lat: Number(v.lat),
    lng: Number(v.lng),
    hubId: v.hub_id ?? undefined,
    alert: ALERT_OUT[v.alert_state] ?? "ok",
    delivery: Boolean(v.deliverable),
    qrCode: v.qr_code,
  };
}

function toClientHub(h: HubRow) {
  return {
    id: h.id,
    name: h.name,
    zone: h.zone,
    lat: Number(h.lat),
    lng: Number(h.lng),
    capacity: h.capacity,
    occupied: h.occupied ?? 0,
    charging: h.charging,
    active: h.active === 1,
  };
}

function toClientAlert(a: AlertRow) {
  return { ...a, type: ALERT_OUT[a.type] ?? a.type };
}

function sse(): Response {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  const bodyStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: hello\ndata: {}\n\n"));
      unsubscribe = stream.add((type, data) => {
        try {
          controller.enqueue(encoder.encode(`event: ${type}\ndata: ${data}\n\n`));
        } catch {
          /* ya cerrada */
        }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });
  return new Response(bodyStream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
