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
  type BoldOrderRow,
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
import {
  boldConfig,
  createPaymentLink,
  getLinkStatus,
  parseWebhook,
  verifyWebhookSignature,
  type BoldConfig,
} from "../services/bold";
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
/** Operaciones de cobro en curso: evita doble cobro por doble clic o peticiones paralelas. */
const inFlight = new Set<string>();
/** UC14-E2: un domiciliario no recibe más de este número de entregas abiertas a la vez. */
export const MAX_ACTIVE_DELIVERIES = 5;

/** Ejecuta varias escrituras como una sola: si una falla, no queda ninguna (todo o nada). */
function atomically<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

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
 * Router REST del backend de desarrollo. Cada ruta sigue las secuencias de
 * entregables/diagramas (15 a 20) y el contrato de docs/api/openapi.yaml
 * (contrato-first, RNF-10).
 */
export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // ---------- system ----------
    if (method === "GET" && path === "/api/health") {
      return ok({ ok: true, source: "sqlite" });
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
      if (!email.includes("@") || email.length > 254)
        throw httpError(422, "Escribe un correo válido (por ejemplo nombre@dominio.com)");
      if (password.length < 8 || password.length > 128)
        throw httpError(422, "La contraseña debe tener entre 8 y 128 caracteres");
      if (String(b.name ?? "").trim().length > 80)
        throw httpError(422, "El nombre no puede superar 80 caracteres");
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

    // Webhook de Bold: público (lo llama Bold, sin cookie); se autentica por la firma.
    if (method === "POST" && path === "/api/payments/bold/webhook") {
      return await boldWebhook(request);
    }

    const boldOrderMatch = path.match(/^\/api\/payments\/bold\/([^/]+)$/);
    if (method === "GET" && boldOrderMatch?.[1]) {
      const u = requireUser(request);
      return await boldOrderStatus(u.id, boldOrderMatch[1]);
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
      if (modality === "delivery" && !v.deliverable)
        throw httpError(422, "Este vehículo no tiene entrega a domicilio; recógelo en su hub");
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
      atomically(() => {
        repos.reservations.create(r);
        repos.vehicles.setStatus(v.id, "reserved");
      });
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
      if (!r || r.user_id !== u.id || r.status !== "active" || inFlight.has(r.id))
        throw httpError(404, "No hay un viaje activo que cerrar");
      inFlight.add(r.id);
      try {
        const v = repos.vehicles.byId(r.vehicle_id) as VehicleRow | undefined;
        if (!v) throw httpError(404, "Vehículo no encontrado");
        const minutes = Math.max(1, (Date.now() - Number(r.started_at)) / 60_000);
        const total = rentalCost(minutes, v.rate_per_min_cop ?? 500);
        const bold = boldConfig();
        if (bold) {
          // Con Bold el viaje se cierra cuando el webhook confirma el pago (finalizeOrder).
          return await startBoldCheckout(bold, u.id, {
            ownerType: "reservation",
            ownerId: r.id,
            kind: "cargo_viaje",
            amountCop: total,
            description: `Viaje ${v.model} (${Math.ceil(minutes)} min)`,
            returnPath: "/pago/resultado",
          });
        }
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
        atomically(() => {
          repos.reservations.setStatus(r.id, "completed", {
            ended_at: Date.now(),
            total_cost_cop: total,
          });
          repos.vehicles.setStatus(r.vehicle_id, "available");
        });
        return ok({
          reservation: repos.reservations.byId(r.id),
          total,
          reference: result.reference ?? null,
        });
      } finally {
        inFlight.delete(r.id);
      }
    }

    // ---------- desbloqueo (UC08/UC09) ----------
    if (method === "POST" && path === "/api/unlock/sessions") {
      const u = requireUser(request);
      const b = await body<UnlockCreateBody>(request);
      const r = repos.reservations.byId(String(b.reservationId)) as ReservationRow | undefined;
      if (!r || r.user_id !== u.id || r.status !== "requested")
        throw httpError(
          409,
          "Primero reserva este vehículo y paga el prepago; luego podrás desbloquearlo",
        );
      if (boldConfig() && !repos.payments.hasApproved("reservation", r.id, "base"))
        throw httpError(402, "Completa el pago del prepago en Bold para desbloquear el vehículo");
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
        atomically(() => {
          repos.reservations.setStatus(reservation.id, next.status, { started_at: now });
          repos.vehicles.setStatus(session.vehicleId, "in_use");
        });
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
        throw httpError(409, "Esta reserva ya tiene una entrega en curso");
      const courier = getDb()
        .prepare("SELECT id, role FROM users WHERE id=?")
        .get(String(b.courierId)) as { id: string; role: string } | undefined;
      if (!courier || courier.role !== "courier")
        throw httpError(422, "El destinatario debe ser un domiciliario");
      const open = repos.deliveries.list({
        courierId: courier.id,
        status: ["assigned", "in_progress", "late"],
      });
      if (open.length >= MAX_ACTIVE_DELIVERIES)
        throw httpError(
          422,
          `Este domiciliario ya tiene ${open.length} entregas abiertas (máximo ${MAX_ACTIVE_DELIVERIES}); elige otro`,
        );
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
      if (u.role === "courier" && d.courier_id !== u.id) throw httpError(403, "Solo tu entrega");
      const action = String(b.action ?? "");
      if (action === "start") {
        if (d.status !== "assigned")
          throw httpError(409, `Transición inválida desde '${d.status}'`);
        repos.deliveries.update(d.id, { status: "in_progress" });
      } else if (action === "deliver") {
        if (d.status !== "in_progress" && d.status !== "late")
          throw httpError(409, `No puedes entregar desde '${d.status}'`);
        if (d.status === "late" && !String(b.reason ?? "").trim() && u.role === "courier")
          throw httpError(422, "Una entrega tardía se confirma con justificación");
        // UC16: entrega, reserva y vehículo cambian juntos (todo o nada). El cliente ya tiene el
        // vehículo: la reserva queda activa (empieza a contar el tiempo) y se cierra cuando él
        // termina el viaje, igual que en la modalidad hub.
        const r = repos.reservations.byId(d.reservation_id) as ReservationRow | undefined;
        const now = Date.now();
        atomically(() => {
          repos.deliveries.update(d.id, { status: "delivered", delivered_at: now });
          if (r && r.status === "requested") {
            repos.reservations.setStatus(r.id, "active", { started_at: now });
            repos.vehicles.setStatus(r.vehicle_id, "in_use");
          }
        });
      } else if (action === "late") {
        if (d.status === "delivered") throw httpError(409, "Entrega ya completada");
        if (d.status === "late") throw httpError(409, "La entrega ya está marcada como tardía");
        const reason = String(b.reason ?? "").trim();
        if (!reason) throw httpError(422, "Escribe la causa del retraso");
        markLate(d.id, reason);
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
    const e = error as { status?: number; message?: string; name?: string };
    const status =
      e.status ??
      (e.name === "InvalidTransitionError" || e.name === "UnlockOrderError" ? 409 : 500);
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
  if (p.status !== "pending" || inFlight.has(p.id))
    throw httpError(409, "Esta compra ya fue procesada");
  const unit = repos.vehicles.byId(p.vehicle_id) as VehicleRow | undefined;
  if (!unit || unit.status !== "available")
    throw httpError(409, "Ese vehículo ya no está disponible para la venta");
  inFlight.add(p.id);
  try {
    const bold = boldConfig();
    if (bold)
      return await startBoldCheckout(bold, u.id, {
        ownerType: "purchase",
        ownerId: p.id,
        kind: "base",
        amountCop: p.price_cop,
        description: `Compra ${unit.model}`,
        returnPath: "/pago/resultado",
      });
    return await chargePurchase(p);
  } finally {
    inFlight.delete(p.id);
  }
}

async function chargePurchase(p: PurchaseRow): Promise<Response> {
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
    if (result.reason === "timeout")
      // UC18-E2: la pasarela no respondió; la compra sigue pendiente y se puede reintentar.
      throw httpError(402, "La pasarela de pagos no respondió a tiempo. Intenta de nuevo.");
    repos.purchases.setStatus(p.id, "failed");
    throw httpError(402, `Pago rechazado: ${result.reason ?? "motivo no informado"}`);
  }
  atomically(() => {
    repos.purchases.setStatus(p.id, "paid", Date.now());
    repos.vehicles.setStatus(p.vehicle_id, "sold");
  });
  return ok({ purchase: repos.purchases.byId(p.id), reference: result.reference ?? null });
}

async function payReservation(u: { id: string }, reservationId: string): Promise<Response> {
  const r = repos.reservations.byId(reservationId) as ReservationRow | undefined;
  if (!r || r.user_id !== u.id) throw httpError(404, "Reserva no encontrada");
  if (
    r.status !== "requested" ||
    inFlight.has(r.id) ||
    repos.payments.hasApproved("reservation", r.id, "base")
  )
    throw httpError(409, "La reserva ya está pagada o cerrada");
  inFlight.add(r.id);
  try {
    const bold = boldConfig();
    if (bold)
      return await startBoldCheckout(bold, u.id, {
        ownerType: "reservation",
        ownerId: r.id,
        kind: "base",
        amountCop: BASE_PREPAY_COP,
        description: "Prepago de reserva",
        returnPath: "/pago/resultado",
      });
    return await chargeReservation(r);
  } finally {
    inFlight.delete(r.id);
  }
}

async function chargeReservation(r: ReservationRow): Promise<Response> {
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
  if (result.status === "rejected")
    throw httpError(
      402,
      result.reason === "timeout"
        ? "La pasarela de pagos no respondió a tiempo. Intenta de nuevo."
        : `Pago rechazado: ${result.reason ?? "?"}`,
    );
  repos.vehicles.setStatus(r.vehicle_id, "reserved");
  return ok({ reservation: r, prepayCop: BASE_PREPAY_COP, reference: result.reference ?? null });
}

// ---------- Bold (pago en línea asíncrono) ----------
type CheckoutInput = {
  ownerType: "purchase" | "reservation";
  ownerId: string;
  kind: "base" | "cargo_viaje";
  amountCop: number;
  description: string;
  returnPath: string;
};

/** Un link de Bold vence a los 30 min; se reutiliza solo si aún le queda margen. */
const ORDER_REUSE_MS = 25 * 60_000;

function checkoutResponse(o: BoldOrderRow): Response {
  return ok(
    { status: "pending", orderId: o.id, checkoutUrl: o.checkout_url, amountCop: o.amount_cop },
    { status: 202 },
  );
}

async function startBoldCheckout(
  cfg: BoldConfig,
  userId: string,
  c: CheckoutInput,
): Promise<Response> {
  const existing = repos.boldOrders.pendingFor(c.ownerType, c.ownerId, c.kind);
  if (existing && Date.now() - existing.created_at < ORDER_REUSE_MS)
    return checkoutResponse(existing);
  const id = uid("BLD");
  let link;
  try {
    link = await createPaymentLink(cfg, {
      reference: id,
      amountCop: c.amountCop,
      description: c.description,
      returnPath: `${c.returnPath}?order=${id}`,
    });
  } catch (e) {
    console.error("[bold] no se pudo crear el link de pago:", e instanceof Error ? e.message : e);
    throw httpError(502, "No pudimos iniciar el pago con Bold. Intenta de nuevo en un momento.");
  }
  repos.boldOrders.create({
    id,
    user_id: userId,
    owner_type: c.ownerType,
    owner_id: c.ownerId,
    kind: c.kind,
    amount_cop: c.amountCop,
    link_id: link.linkId,
    checkout_url: link.checkoutUrl,
    created_at: Date.now(),
  });
  return checkoutResponse(repos.boldOrders.byId(id) as BoldOrderRow);
}

/**
 * Cierra una orden de Bold: registra el pago y aplica el efecto de negocio de forma atómica.
 * Idempotente: si la orden ya no está pendiente no hace nada (Bold puede repetir webhooks).
 */
function finalizeBoldOrder(
  o: BoldOrderRow,
  result: "approved" | "rejected",
  reason: string | null,
  reference: string | null,
): void {
  atomically(() => {
    if (!repos.boldOrders.resolve(o.id, result, reason)) return;
    repos.payments.create({
      id: uid("PAY"),
      owner_type: o.owner_type,
      owner_id: o.owner_id,
      kind: o.kind,
      amount_cop: o.amount_cop,
      reference,
      status: result,
      reason,
      created_at: Date.now(),
    });
    if (o.owner_type === "purchase") {
      const p = repos.purchases.byId(o.owner_id) as PurchaseRow | undefined;
      if (!p) return;
      if (result === "approved") {
        repos.purchases.setStatus(p.id, "paid", Date.now());
        repos.vehicles.setStatus(p.vehicle_id, "sold");
      } else {
        repos.purchases.setStatus(p.id, "failed");
      }
      return;
    }
    const r = repos.reservations.byId(o.owner_id) as ReservationRow | undefined;
    if (!r) return;
    if (o.kind === "cargo_viaje") {
      if (result === "approved" && r.status === "active") {
        repos.reservations.setStatus(r.id, "completed", {
          ended_at: Date.now(),
          total_cost_cop: o.amount_cop,
        });
        repos.vehicles.setStatus(r.vehicle_id, "available");
      }
      return; // rechazado: el viaje sigue activo y se puede reintentar
    }
    // Prepago: aprobado => la reserva ya tiene el vehículo apartado; vencido => se libera.
    if (result === "rejected" && r.status === "requested") {
      repos.reservations.setStatus(r.id, "cancelled");
      repos.vehicles.setStatus(r.vehicle_id, "available");
    }
  });
}

async function boldWebhook(request: Request): Promise<Response> {
  const cfg = boldConfig();
  if (!cfg) throw httpError(503, "Bold no está configurado");
  const raw = await request.text();
  const sig = request.headers.get("x-bold-signature");
  // En modo pruebas Bold firma con llave vacía.
  const valid =
    verifyWebhookSignature(raw, sig, cfg.secretKey) ||
    (cfg.sandbox && verifyWebhookSignature(raw, sig, ""));
  if (!valid) throw httpError(401, "Firma inválida");
  const evt = parseWebhook(raw);
  const order = evt?.reference ? repos.boldOrders.byLink(evt.reference) : undefined;
  // 200 siempre que la firma sea válida: Bold reintenta ante cualquier otro código.
  if (!evt || !order) return ok({ received: true });
  if (evt.type === "SALE_APPROVED") {
    finalizeBoldOrder(order, "approved", null, evt.paymentId);
  } else if (evt.type === "SALE_REJECTED") {
    // El link sigue activo y el usuario puede reintentar: solo se deja constancia del intento.
    repos.payments.create({
      id: uid("PAY"),
      owner_type: order.owner_type,
      owner_id: order.owner_id,
      kind: order.kind,
      amount_cop: order.amount_cop,
      reference: evt.paymentId,
      status: "rejected",
      reason: "pago rechazado por Bold",
      created_at: Date.now(),
    });
  }
  return ok({ received: true });
}

/** Estado de una orden; si sigue pendiente se concilia con Bold (por si el webhook se demora). */
async function boldOrderStatus(userId: string, orderId: string): Promise<Response> {
  let o = repos.boldOrders.byId(orderId);
  if (!o || o.user_id !== userId) throw httpError(404, "Pago no encontrado");
  const cfg = boldConfig();
  if (o.status === "pending" && cfg) {
    try {
      const { status, transactionId } = await getLinkStatus(cfg, o.link_id);
      if (status === "PAID") finalizeBoldOrder(o, "approved", null, transactionId);
      else if (status === "EXPIRED" || status === "CANCELLED")
        finalizeBoldOrder(o, "rejected", status === "EXPIRED" ? "link vencido" : "cancelado", null);
      o = repos.boldOrders.byId(orderId) as BoldOrderRow;
    } catch (e) {
      console.error("[bold] no se pudo consultar el link:", e instanceof Error ? e.message : e);
    }
  }
  return ok({
    orderId: o.id,
    status: o.status,
    ownerType: o.owner_type,
    ownerId: o.owner_id,
    kind: o.kind,
    amountCop: o.amount_cop,
    reason: o.reason,
    checkoutUrl: o.status === "pending" ? o.checkout_url : null,
  });
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
