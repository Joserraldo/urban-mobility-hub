import { repos } from "../repositories";
import { stream } from "./stream";

export type LateNotice = {
  customerEmail: string;
  customerName: string;
  operatorEmail: string;
  courierName: string;
  vehicleModel: string;
  address: string;
  minutesLate: number;
};

export type ReservationNotice = {
  reservationId: string;
  customerEmail: string;
  customerName: string;
  vehicleModel: string;
  vehicleId: string;
  /** "hub" = recoger en estación; "delivery" = a domicilio. */
  modality: string;
  address?: string | null;
  hubName?: string | null;
  ratePerMinCop?: number | null;
  prepayCop: number;
  /** Copia para la operación (correo del operador). */
  operatorEmail?: string | undefined;
};

/**
 * Punto único de salida HTTP para poder inyectar un doble en las pruebas unitarias
 * (RNF-10 / riesgo RD8: la notificación es lateral y debe poder fallar sin romper).
 */
type FetchLike = typeof fetch;
let fetchImpl: FetchLike = (...a) => fetch(...a);
export function __setFetch(impl?: FetchLike): void {
  fetchImpl = impl ?? ((...a) => fetch(...a));
}

const SENDER_NAME = "Urban Mobility Hub";

function senderEmail(): string {
  return process.env["BREVO_SENDER"] ?? "no-reply@urban-mobility-hub.test";
}

type Mail = { toEmail: string; toName: string; subject: string; html: string };

/**
 * Envía un correo por la API REST de Brevo (cero SDK) y deja el rastro en `notifications`.
 * Sin `BREVO_API_KEY` (modo demo) queda `simulated`; si Brevo falla queda `failed`.
 * Nunca lanza: la notificación es lateral a la operación.
 */
async function deliver(notifId: string, orig: Mail, event: Record<string, unknown>): Promise<void> {
  // BREVO_FORCE_TO: demo/pruebas — todo correo sale a esa dirección (se indica el destinatario original).
  const forceTo = process.env["BREVO_FORCE_TO"]?.trim();
  const mail: Mail = forceTo
    ? {
        ...orig,
        toEmail: forceTo,
        toName: orig.toName,
        subject: `[para ${orig.toEmail}] ${orig.subject}`,
      }
    : orig;
  const apiKey = process.env["BREVO_API_KEY"];
  if (!apiKey) {
    repos.notifications.setStatus(notifId, "simulated");
    stream.emit("notification", {
      ...event,
      to: mail.toEmail,
      status: "simulated",
      html: mail.html,
    });
    return;
  }
  try {
    const res = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: senderEmail() },
        to: [{ email: mail.toEmail, name: mail.toName }],
        subject: mail.subject,
        htmlContent: mail.html,
      }),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { messageId?: string };
    repos.notifications.setStatus(notifId, "sent", body.messageId);
    stream.emit("notification", { ...event, to: mail.toEmail, status: "sent" });
  } catch (error) {
    repos.notifications.setStatus(notifId, "failed", undefined, String(error).slice(0, 300));
    stream.emit("notification", { ...event, to: mail.toEmail, status: "failed" });
  }
}

/**
 * UC19 Notificar retraso por correo (RF-27). Sin `BREVO_API_KEY` (modo demo) deja la
 * notificación como `simulated`: el aviso queda visible en /admin y la operación NO se rompe.
 */
export async function notifyLateDelivery(deliveryId: string, notice: LateNotice): Promise<void> {
  const html = renderTemplate(notice);

  const targets = [
    { userId: "customer", email: notice.customerEmail, name: notice.customerName },
    { userId: "operator", email: notice.operatorEmail, name: "Operación UMH" },
  ];

  for (const t of targets) {
    const row = repos.deliveries.byId(deliveryId);
    const reservation = row ? repos.reservations.byId(row.reservation_id as string) : undefined;
    const realUserId = t.userId === "customer" ? (reservation?.user_id as string) : operatorId();
    if (!realUserId) continue;

    const notifId = repos.notifications.ensure({
      userId: realUserId,
      deliveryId,
      template: "entrega_tardia",
      toEmail: t.email,
    });
    if (!notifId) continue; // UNIQUE: ya se notificó esta entrega (RF-27: no duplicar)

    await deliver(
      notifId,
      {
        toEmail: t.email,
        toName: t.name,
        subject: "Tu entrega va con retraso — Urban Mobility Hub",
        html,
      },
      { deliveryId },
    );
  }
}

/**
 * Confirmación de reserva: se envía cada vez que un cliente reserva. Va al cliente y,
 * como copia, a Operación (`BREVO_COPY_TO` si existe; si no, el correo del operador).
 */
export async function notifyReservation(notice: ReservationNotice): Promise<void> {
  const reservation = repos.reservations.byId(notice.reservationId);
  if (!reservation) return;
  const html = renderReservationTemplate(notice);

  const targets: { userId: string | undefined; email: string; name: string; copy: boolean }[] = [
    {
      userId: reservation.user_id,
      email: notice.customerEmail,
      name: notice.customerName,
      copy: false,
    },
  ];
  const copyTo = process.env["BREVO_COPY_TO"]?.trim() || notice.operatorEmail;
  if (copyTo && copyTo.toLowerCase() !== notice.customerEmail.toLowerCase()) {
    targets.push({ userId: operatorId(), email: copyTo, name: "Operación UMH", copy: true });
  }

  for (const t of targets) {
    if (!t.userId) continue;
    const notifId = repos.notifications.ensure({
      userId: t.userId,
      template: "reserva_creada",
      toEmail: t.email,
    });
    if (!notifId) continue;
    await deliver(
      notifId,
      {
        toEmail: t.email,
        toName: t.name,
        subject: t.copy
          ? `Nueva reserva ${notice.reservationId} — ${notice.vehicleModel}`
          : `Reserva confirmada: ${notice.vehicleModel} — Urban Mobility Hub`,
        html,
      },
      { reservationId: notice.reservationId },
    );
  }
}

function operatorId(): string | undefined {
  return repos.users.firstOperator()?.id as string | undefined;
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")} COP`;

const SITE = "https://urbanmobility.duckdns.org";

/**
 * Plantilla base de todos los correos: tabla de 600 px con estilos en línea
 * (compatible con Gmail/Outlook), cabecera de marca, tarjeta de datos y botón.
 */
function layout(o: {
  preheader: string;
  badge: string;
  badgeColor: string;
  title: string;
  intro: string;
  rows: [string, string][];
  note?: string;
  cta?: { label: string; href: string };
  footer: string;
}): string {
  const rows = o.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 0;border-bottom:1px solid #E6ECF4;color:#6B7A90;font-size:13px;width:38%">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #E6ECF4;color:#0B1B33;font-size:14px;font-weight:600;text-align:right">${v}</td></tr>`,
    )
    .join("");
  const cta = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 4px"><tr><td style="background:#0B1B33;border-radius:10px"><a href="${esc(o.cta.href)}" style="display:inline-block;padding:13px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none">${esc(o.cta.label)}</a></td></tr></table>`
    : "";
  const note = o.note
    ? `<p style="margin:20px 0 0;padding:14px 16px;background:#F1F6FF;border-left:4px solid #19B6E6;border-radius:6px;color:#274060;font-size:13px;line-height:1.6">${o.note}</p>`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#EAF0F7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0B1B33">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAF0F7"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(11,27,51,.10)">
<tr><td style="background:#0B1B33;padding:26px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.2px">⚡ Urban Mobility Hub</span><br><span style="color:#8FB4D9;font-size:12px">Micromovilidad eléctrica · Bucaramanga</span></td>
<td align="right"><span style="display:inline-block;background:${o.badgeColor};color:#06121F;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:6px 12px;border-radius:999px">${esc(o.badge)}</span></td>
</tr></table></td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#19B6E6,#7BE495);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 32px 10px">
<h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#0B1B33">${esc(o.title)}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#33465F">${o.intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:12px;padding:6px 18px"><tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table>
${note}${cta}
</td></tr>
<tr><td style="padding:22px 32px 28px;color:#7A8AA0;font-size:12px;line-height:1.6;text-align:center">${o.footer}<br><a href="${SITE}" style="color:#1583B5;text-decoration:none">${SITE.replace("https://", "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function renderTemplate(n: LateNotice): string {
  return layout({
    preheader: `Tu ${n.vehicleModel} lleva ${n.minutesLate} min de retraso. Estamos encima del tema.`,
    badge: "Retraso",
    badgeColor: "#FFB84D",
    title: "Tu entrega va con retraso",
    intro: `Hola <b>${esc(n.customerName)}</b>, tu <b>${esc(n.vehicleModel)}</b> con destino a <b>${esc(n.address)}</b> lleva <b style="color:#C0392B">${n.minutesLate} min de retraso</b>. Lamentamos la demora.`,
    rows: [
      ["Domiciliario", esc(n.courierName)],
      ["Vehículo", esc(n.vehicleModel)],
      ["Dirección", esc(n.address)],
      ["Retraso", `${n.minutesLate} min`],
    ],
    note: "Estamos encima del tema. Puedes seguir el estado en la app.",
    cta: { label: "Ver mi entrega", href: `${SITE}/app` },
    footer: `Copia enviada a Operación (${esc(n.operatorEmail)}).<br>Mensaje automático de Urban Mobility Hub.`,
  });
}

export function renderReservationTemplate(n: ReservationNotice): string {
  const delivery = n.modality === "delivery";
  const where = delivery
    ? esc(n.address ?? "Por confirmar")
    : esc(n.hubName ?? "Estación de recogida");
  return layout({
    preheader: `Reserva ${n.reservationId}: ${n.vehicleModel}. Prepago ${cop(n.prepayCop)}.`,
    badge: "Reserva",
    badgeColor: "#7BE495",
    title: "¡Tu reserva está confirmada!",
    intro: `Hola <b>${esc(n.customerName)}</b>, apartamos tu <b>${esc(n.vehicleModel)}</b>. ${
      delivery
        ? "Un domiciliario te lo llevará a la dirección indicada."
        : "Te espera en su estación; desbloquéalo con el código QR."
    }`,
    rows: [
      ["Reserva", esc(n.reservationId)],
      ["Vehículo", `${esc(n.vehicleModel)} · ${esc(n.vehicleId)}`],
      [delivery ? "Entrega a domicilio" : "Recoger en", where],
      ...(n.ratePerMinCop
        ? ([["Tarifa", `${cop(n.ratePerMinCop)} / min`]] as [string, string][])
        : []),
      ["Prepago", cop(n.prepayCop)],
    ],
    note: `<b>¿Cómo sigue?</b> Paga el prepago de ${cop(n.prepayCop)} en la app, desbloquea el vehículo con QR y casco, y al terminar se cobra el tiempo usado (minutos redondeados hacia arriba).`,
    cta: { label: "Abrir mis reservas", href: `${SITE}/app` },
    footer: `Recibiste este correo porque hiciste una reserva en Urban Mobility Hub.<br>Pagos de prueba · mensaje automático.`,
  });
}
