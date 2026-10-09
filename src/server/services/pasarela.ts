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
    if (amountCop === 999_999) {
      return { status: "rejected", reason: "fondos insuficientes (monto de prueba de rechazo)" };
    }
    if (method === "cash" && amountCop > 5_000_000) {
      return { status: "rejected", reason: "efectivo no permitido sobre $5.000.000 COP" };
    }
    return { status: "approved", reference: `PAY-${randomBytes(4).toString("hex").toUpperCase()}` };
  },
};

export function getGateway(): PaymentGateway {
  return simulatedGateway;
}
