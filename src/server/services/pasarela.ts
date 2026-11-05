import { randomBytes } from "node:crypto";

export type ChargeInput = {
  amountCop: number;
  method: "card" | "pse" | "cash";
};

export type ChargeResult = {
  status: "approved" | "rejected";
  reference?: string;
  reason?: string;
};

/** Tiempo máximo que se espera a la pasarela antes de dar el pago por rechazado (UC18-E2). */
export const PAYMENT_TIMEOUT_MS = 8_000;

/** Monto de prueba que simula una pasarela que nunca responde (para demostrar el timeout). */
export const TIMEOUT_TEST_AMOUNT = 888_888;

/**
 * UC18 Realizar pago — pasarela. La implementación real (Wompi/PayU) encaja en esta
 * misma interfaz; en la demo se usa la simulada, determinista para que los e2e no
 * dependan del azar: `999999` siempre se rechaza (pago de prueba fallido).
 */
export interface PaymentGateway {
  name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
}

export const simulatedGateway: PaymentGateway = {
  name: "simulada",
  async charge({ amountCop, method }) {
    await new Promise((r) => setTimeout(r, 350)); // latencia escénica del "procesando pago"
    if (amountCop === TIMEOUT_TEST_AMOUNT) {
      await new Promise(() => undefined); // nunca responde: lo corta `chargeWithTimeout`
    }
    if (amountCop === 999_999) {
      return { status: "rejected", reason: "fondos insuficientes (monto de prueba de rechazo)" };
    }
    if (method === "cash" && amountCop > 5_000_000) {
      return { status: "rejected", reason: "efectivo no permitido sobre $5.000.000 COP" };
    }
    return { status: "approved", reference: `PAY-${randomBytes(4).toString("hex").toUpperCase()}` };
  },
};

/**
 * Envuelve cualquier pasarela con un límite de tiempo. Si no responde a tiempo, el pago queda
 * `rejected` con `reason='timeout'` y quien llama deja el negocio intacto (compra pendiente,
 * vehículo disponible).
 */
export function withTimeout(
  gateway: PaymentGateway,
  timeoutMs = PAYMENT_TIMEOUT_MS,
): PaymentGateway {
  return {
    name: gateway.name,
    charge(input) {
      return new Promise<ChargeResult>((resolve, reject) => {
        const timer = setTimeout(
          () => resolve({ status: "rejected", reason: "timeout" }),
          timeoutMs,
        );
        gateway.charge(input).then(
          (r) => {
            clearTimeout(timer);
            resolve(r);
          },
          (e: unknown) => {
            clearTimeout(timer);
            reject(e instanceof Error ? e : new Error(String(e)));
          },
        );
      });
    },
  };
}

export function getGateway(): PaymentGateway {
  return withTimeout(simulatedGateway);
}
