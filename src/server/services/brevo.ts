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

/**
 * Punto único de salida HTTP para poder inyectar un doble en las pruebas unitarias
 * (RNF-10 / riesgo RD8: la notificación es lateral y debe poder fallar sin romper).
 */
type FetchLike = typeof fetch;
let fetchImpl: FetchLike = (...a) => fetch(...a);
export function __setFetch(impl?: FetchLike): void {
  fetchImpl = impl ?? ((...a) => fetch(...a));
}

/**
 * UC19 Notificar retraso por correo (RF-27). Llama a la API REST de Brevo con fetch
 * (cero SDK). Sin `BREVO_API_KEY` (modo demo) deja la notificación como `simulated`:
 * el aviso queda visible en /admin y la operación NO se rompe jamás.
 */
export async function notifyLateDelivery(deliveryId: string, notice: LateNotice): Promise<void> {
  const apiKey = process.env["BREVO_API_KEY"];
  const senderEmail = process.env["BREVO_SENDER"] ?? "no-reply@urban-mobility-hub.test";
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

    if (!apiKey) {
      repos.notifications.setStatus(notifId, "simulated");
      stream.emit("notification", { deliveryId, to: t.email, status: "simulated", html });
      continue;
    }

    try {
      const res = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: { "content-type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          sender: { name: "Urban Mobility Hub", email: senderEmail },
          to: [{ email: t.email, name: t.name }],
          subject: "Tu entrega va con retraso — Urban Mobility Hub",
          htmlContent: html,
        }),
      });
      if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = (await res.json()) as { messageId?: string };
      repos.notifications.setStatus(notifId, "sent", body.messageId);
      stream.emit("notification", { deliveryId, to: t.email, status: "sent" });
    } catch (error) {
      repos.notifications.setStatus(notifId, "failed", undefined, String(error).slice(0, 300));
      stream.emit("notification", { deliveryId, to: t.email, status: "failed" });
    }
  }
}

function operatorId(): string | undefined {
  return repos.users.firstOperator()?.id as string | undefined;
}

export function renderTemplate(n: LateNotice): string {
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#EEF2F7;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;color:#1B2A41">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #D9E1EC">
<tr><td style="background:#1B2A41;padding:22px 28px"><span style="color:#fff;font-size:18px;font-weight:700">Urban Mobility Hub</span><br><span style="color:#9FB3CC;font-size:12px">Movilidad urbana · Bucaramanga</span></td></tr>
<tr><td style="padding:28px">
<h2 style="margin:0 0 12px;font-size:20px">Tu entrega va con retraso</h2>
<p style="margin:0 0 18px;line-height:1.55">Hola ${esc(n.customerName)}, tu <b>${esc(n.vehicleModel)}</b> con destino a <b>${esc(n.address)}</b> lleva <b style="color:#C0392B">${n.minutesLate} min de retraso</b>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FB;border-radius:10px"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.7">
<b>Domiciliario:</b> ${esc(n.courierName)}<br><b>Vehículo:</b> ${esc(n.vehicleModel)}<br><b>Dirección:</b> ${esc(n.address)}</td></tr></table>
<p style="margin:18px 0 0;line-height:1.55">Estamos encima del tema. Puedes seguir el estado en la app o responder este correo.</p>
</td></tr>
<tr><td style="padding:14px 28px;background:#F6F8FB;color:#6B7A90;font-size:12px">Copia enviada a Operación (${esc(n.operatorEmail)}). Mensaje automático de Urban Mobility Hub.</td></tr>
</table></body></html>`;
}
