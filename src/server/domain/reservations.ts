// RF-05, RF-03, R-17/R-18 del SRS · riesgo RD13.

export type ReservationStatus = "requested" | "active" | "completed" | "cancelled";
export type ReservationEvent = "start" | "finish" | "cancel";

const ESTADO_ES: Record<string, string> = {
  requested: "solicitada",
  active: "en curso",
  completed: "completada",
  cancelled: "cancelada",
};

export class InvalidTransitionError extends Error {
  constructor(message = "Transición de reserva no permitida") {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

const TRANSITIONS: Record<
  ReservationStatus,
  Partial<Record<ReservationEvent, ReservationStatus>>
> = {
  requested: { start: "active", cancel: "cancelled" },
  active: { finish: "completed", cancel: "cancelled" },
  completed: {},
  cancelled: {},
};

/** Devuelve una nueva reserva con el estado transicionado; nunca muta la original. */
export function transition<T extends { status: ReservationStatus }>(
  reservation: T,
  event: ReservationEvent,
): T {
  const next = TRANSITIONS[reservation.status][event];
  if (!next) {
    throw new InvalidTransitionError(
      `Esta reserva ya no admite esa acción (estado actual: ${ESTADO_ES[reservation.status] ?? reservation.status}).`,
    );
  }
  return { ...reservation, status: next };
}

/** Costo del alquiler: minutos facturables (redondeo hacia arriba) por tarifa. */
export function rentalCost(minutes: number, pricePerMinute: number): number {
  if (minutes <= 0) throw new RangeError("Los minutos deben ser mayores que cero");
  return Math.ceil(minutes) * pricePerMinute;
}
