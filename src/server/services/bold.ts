import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente de la pasarela Bold (API de link de pagos). Documentación:
 * https://developers.bold.co/pagos-en-linea/api-link-de-pagos y https://developers.bold.co/webhook
 *
 * Flujo: se crea un link de pago (`POST /online/link/v1`), el usuario paga en el checkout de Bold
 * y Bold avisa por webhook firmado (`x-bold-signature`). Con llaves de PRUEBA el checkout corre en
 * sandbox y la firma del webhook usa una llave vacía.
 */

const BOLD_API = "https://integrations.api.bold.co";
/** API de consulta del Botón de pagos (checkout embebido). */
const BOLD_PAYMENTS_API = "https://payments.api.bold.co";

export type BoldLinkStatus =
  "ACTIVE" | "PROCESSING" | "PAID" | "REJECTED" | "CANCELLED" | "EXPIRED";

export type BoldConfig = {
  /** Llave de identidad (cabecera `Authorization: x-api-key`). */
  identityKey: string;
  /** Llave secreta: firma de integridad del checkout embebido (la de PRUEBAS en sandbox). */
  secretKey: string;
  /** URL pública del sitio, para `callback_url`. */
  publicUrl: string;
  sandbox: boolean;
  /**
   * Checkout embebido (el pago se abre dentro de la página). Requiere la llave secreta para firmar
   * la orden; sin ella, o con `BOLD_EMBEDDED=0`, se usa el link de pago (redirige a Bold).
   */
  embedded: boolean;
};

/** Devuelve la configuración si hay llave de identidad; si no, la app usa la pasarela simulada. */
export function boldConfig(env: NodeJS.ProcessEnv = process.env): BoldConfig | undefined {
  const identityKey = env["BOLD_IDENTITY_KEY"]?.trim();
  if (!identityKey) return undefined;
  const secretKey = env["BOLD_SECRET_KEY"]?.trim() ?? "";
  return {
    identityKey,
    secretKey,
    publicUrl: (env["UMH_PUBLIC_URL"] ?? "http://localhost:8080").replace(/\/+$/, ""),
    sandbox: (env["BOLD_ENV"] ?? "test") !== "production",
    embedded: secretKey !== "" && env["BOLD_EMBEDDED"] !== "0",
  };
}

/** Datos que el navegador necesita para abrir el checkout embebido de Bold. */
export type EmbeddedCheckout = {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: "COP";
  description: string;
  integritySignature: string;
  redirectionUrl: string;
};

/** Firma de integridad: SHA-256 hex de `{orderId}{monto}{divisa}{llaveSecreta}`. */
export function integritySignature(
  orderId: string,
  amount: number,
  currency: string,
  secretKey: string,
): string {
  return createHash("sha256").update(`${orderId}${amount}${currency}${secretKey}`).digest("hex");
}

export function embeddedCheckout(
  cfg: BoldConfig,
  o: { orderId: string; amountCop: number; description: string; returnPath: string },
): EmbeddedCheckout {
  return {
    apiKey: cfg.identityKey,
    orderId: o.orderId,
    amount: o.amountCop,
    currency: "COP",
    description: o.description.slice(0, 100),
    integritySignature: integritySignature(o.orderId, o.amountCop, "COP", cfg.secretKey),
    redirectionUrl: `${cfg.publicUrl}${o.returnPath}`,
  };
}

export type CreateLinkInput = {
  /** Referencia propia (letras, números, `_` y `-`; máx. 60). */
  reference: string;
  amountCop: number;
  description: string;
  /** Ruta (con `/`) a la que Bold devuelve al usuario tras pagar. */
  returnPath: string;
};

export type CreatedLink = { linkId: string; checkoutUrl: string };

type FetchFn = typeof fetch;

async function boldFetch(
  cfg: BoldConfig,
  path: string,
  init: RequestInit,
  fetchFn: FetchFn,
  base: string = BOLD_API,
): Promise<unknown> {
  const res = await fetchFn(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `x-api-key ${cfg.identityKey}`,
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const errors = (json as { errors?: { message?: string }[] }).errors;
    const detail = errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Bold: ${detail}`);
  }
  return json;
}

export async function createPaymentLink(
  cfg: BoldConfig,
  input: CreateLinkInput,
  fetchFn: FetchFn = fetch,
): Promise<CreatedLink> {
  const json = (await boldFetch(
    cfg,
    "/online/link/v1",
    {
      method: "POST",
      body: JSON.stringify({
        amount_type: "CLOSE",
        amount: { currency: "COP", total_amount: input.amountCop, tip_amount: 0 },
        reference: input.reference,
        description: input.description.slice(0, 100),
        // Nanosegundos desde epoch: el link vence en 30 minutos.
        expiration_date: (Date.now() + 30 * 60_000) * 1_000_000,
        callback_url: `${cfg.publicUrl}${input.returnPath}`,
      }),
    },
    fetchFn,
  )) as { payload?: { payment_link?: string; url?: string } };
  const linkId = json.payload?.payment_link;
  const checkoutUrl = json.payload?.url;
  if (!linkId || !checkoutUrl) throw new Error("Bold: respuesta sin link de pago");
  return { linkId, checkoutUrl };
}

export async function getLinkStatus(
  cfg: BoldConfig,
  linkId: string,
  fetchFn: FetchFn = fetch,
): Promise<{ status: BoldLinkStatus; transactionId: string | null }> {
  const json = (await boldFetch(
    cfg,
    `/online/link/v1/${encodeURIComponent(linkId)}`,
    { method: "GET" },
    fetchFn,
  )) as { status?: BoldLinkStatus; transaction_id?: string | null };
  return { status: json.status ?? "ACTIVE", transactionId: json.transaction_id ?? null };
}

export type BoldButtonStatus =
  "NO_TRANSACTION_FOUND" | "PROCESSING" | "PENDING" | "APPROVED" | "REJECTED" | "FAILED" | "VOIDED";

/** Estado de una venta del Botón de pagos (checkout embebido) por el identificador de la orden. */
export async function getButtonStatus(
  cfg: BoldConfig,
  orderId: string,
  fetchFn: FetchFn = fetch,
): Promise<{ status: BoldButtonStatus; transactionId: string | null }> {
  const json = (await boldFetch(
    cfg,
    `/v2/payment-voucher/${encodeURIComponent(orderId)}`,
    { method: "GET" },
    fetchFn,
    BOLD_PAYMENTS_API,
  )) as { payment_status?: BoldButtonStatus; transaction_id?: string | null };
  return {
    status: json.payment_status ?? "NO_TRANSACTION_FOUND",
    transactionId: json.transaction_id ?? null,
  };
}

/**
 * Firma del webhook: HMAC-SHA256 (hex) de `base64(cuerpo crudo)` con la llave secreta.
 * Comparación en tiempo constante.
 */
export function signBoldBody(rawBody: string, secretKey: string): string {
  const encoded = Buffer.from(rawBody, "utf8").toString("base64");
  return createHmac("sha256", secretKey).update(encoded).digest("hex");
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signBoldBody(rawBody, secretKey), "utf8");
  const got = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export type BoldWebhookEvent = {
  type: string;
  /** `LNK_…` para pagos hechos desde un link de pago. */
  reference: string | null;
  paymentId: string | null;
};

export function parseWebhook(rawBody: string): BoldWebhookEvent | undefined {
  try {
    const e = JSON.parse(rawBody) as {
      type?: string;
      subject?: string;
      data?: { payment_id?: string; metadata?: { reference?: string | null } };
    };
    if (!e.type) return undefined;
    return {
      type: e.type,
      reference: e.data?.metadata?.reference ?? null,
      paymentId: e.data?.payment_id ?? e.subject ?? null,
    };
  } catch {
    return undefined;
  }
}
