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

function renderTemplate(n: LateNotice): string {
  return `<div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto">
  <h2 style="color:#1B2A41">Urban Mobility Hub — entrega con retraso</h2>
  <p>Hola ${n.customerName}, tu ${n.vehicleModel} con destino a <b>${n.address}</b>
  va con <b>${n.minutesLate} min de retraso</b>. Tu domiciliario es ${n.courierName}.</p>
  <p>Estamos encima. Puedes seguir el estado en la app o responder este correo.</p>
  <p style="color:#6B7A90;font-size:12px">Copia enviada a Operación (${n.operatorEmail}).</p>
</div>`;
}
