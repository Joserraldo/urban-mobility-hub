import { DataError } from "./types";

/**
 * Checkout embebido de Bold: el pago se abre en una ventana (iframe) DENTRO de la página, sin
 * mandar al usuario a otro sitio. Documentación: developers.bold.co (Botón de pagos,
 * `data-render-mode="embedded"`). La orden y su firma de integridad las crea el servidor.
 */
export type EmbeddedPayload = {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: "COP";
  description: string;
  integritySignature: string;
  redirectionUrl: string;
};

type BoldCheckoutCtor = new (config: Record<string, unknown>) => { open: () => void };
declare global {
  interface Window {
    BoldCheckout?: BoldCheckoutCtor;
  }
}

const LIBRARY = "https://checkout.bold.co/library/boldPaymentButton.js";
const POLL_MS = 3_000;
const MAX_WAIT_MS = 15 * 60_000;

let loading: Promise<void> | undefined;
function loadLibrary(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LIBRARY;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = undefined;
      reject(new DataError("No se pudo cargar el pago de Bold. Revisa tu conexión.", "unknown"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

let hostEl: HTMLElement | undefined;

/** Respaldo documentado: el botón de Bold en modo embebido, que abre el mismo iframe al pulsarlo. */
function openWithButton(p: EmbeddedPayload): void {
  hostEl?.remove();
  const host = document.createElement("div");
  host.setAttribute("data-testid", "bold-embedded-host");
  host.className =
    "fixed inset-x-4 bottom-6 z-[100] mx-auto flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 shadow-xl";
  const label = document.createElement("p");
  label.className = "text-sm text-muted-foreground";
  label.textContent = "Abriendo el pago seguro de Bold… si no aparece, pulsa el botón.";
  host.appendChild(label);
  const s = document.createElement("script");
  s.src = LIBRARY;
  s.setAttribute("data-bold-button", "dark-L");
  s.setAttribute("data-api-key", p.apiKey);
  s.setAttribute("data-order-id", p.orderId);
  s.setAttribute("data-amount", String(p.amount));
  s.setAttribute("data-currency", p.currency);
  s.setAttribute("data-integrity-signature", p.integritySignature);
  s.setAttribute("data-description", p.description);
  s.setAttribute("data-redirection-url", p.redirectionUrl);
  s.setAttribute("data-render-mode", "embedded");
  s.onload = () => {
    // El botón se pinta justo después de cargar; se pulsa solo para abrir el pago.
    let tries = 0;
    const timer = setInterval(() => {
      const btn = host.querySelector<HTMLElement>("button, a");
      tries += 1;
      if (btn) {
        clearInterval(timer);
        btn.click();
      } else if (tries > 20) clearInterval(timer);
    }, 150);
  };
  host.appendChild(s);
  document.body.appendChild(host);
  hostEl = host;
}

export async function openEmbeddedCheckout(p: EmbeddedPayload): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await loadLibrary();
  } catch {
    // Sin la librería precargada, el respaldo intenta cargarla con el botón.
    openWithButton(p);
    return;
  }
  if (typeof window.BoldCheckout === "function") {
    new window.BoldCheckout({
      orderId: p.orderId,
      currency: p.currency,
      amount: p.amount,
      apiKey: p.apiKey,
      integritySignature: p.integritySignature,
      description: p.description,
      redirectionUrl: p.redirectionUrl,
      renderMode: "embedded",
    }).open();
    return;
  }
  openWithButton(p);
}

/** Cierra lo que Bold haya dejado abierto (iframe del checkout y el botón de respaldo). */
export function closeEmbeddedCheckout(): void {
  hostEl?.remove();
  hostEl = undefined;
  for (const f of document.querySelectorAll<HTMLIFrameElement>('iframe[src*="bold.co"]')) {
    const parent = f.parentElement;
    f.remove();
    if (parent && parent !== document.body && parent.childElementCount === 0) parent.remove();
  }
}

type StatusPoll = () => Promise<{ status: string; reason?: string | null }>;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Abre el checkout dentro de la página y espera la confirmación del servidor (que consulta a
 * Bold). Resuelve cuando el pago queda aprobado; rechaza si la orden vence o no llega a tiempo.
 */
export async function payWithBold(p: EmbeddedPayload, poll: StatusPoll): Promise<void> {
  await openEmbeddedCheckout(p);
  const deadline = Date.now() + MAX_WAIT_MS;
  try {
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      const s = await poll();
      if (s.status === "approved") return;
      if (s.status === "rejected")
        throw new DataError(`El pago no se completó (${s.reason ?? "rechazado"}).`, "validation");
    }
    throw new DataError(
      "No recibimos la confirmación del pago. Si ya pagaste, revisa “Mis reservas” en unos minutos.",
      "unknown",
    );
  } finally {
    closeEmbeddedCheckout();
  }
}
