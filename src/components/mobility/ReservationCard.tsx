import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  LockOpen,
  MapPin,
  Navigation,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Hub, Reservation, ReservationStatus, Vehicle } from "@/lib/data/types";
import { formatCOP, kindLabel, statusLabel } from "@/lib/format";

/** Enlace de Google Maps con indicaciones hasta unas coordenadas. */
export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

const statusVariant: Record<
  ReservationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  requested: "outline",
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
};

/** Una reserva abierta (solicitada o en viaje) se puede operar; el resto es historial. */
export const isOpenReservation = (r: Reservation) =>
  r.status === "requested" || r.status === "active";

/** Activas primero, luego solicitadas, luego el historial; dentro de cada grupo, la más reciente arriba. */
export function sortReservations(list: Reservation[]): Reservation[] {
  const rank: Record<ReservationStatus, number> = {
    active: 0,
    requested: 1,
    completed: 2,
    cancelled: 3,
  };
  return [...list].sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt - a.createdAt);
}

type Props = {
  reservation: Reservation;
  vehicle?: Vehicle | undefined;
  hub?: Hub | undefined;
  busy?: boolean;
  /** Abre el flujo de desbloqueo (QR, casco, iniciar) de ESTA reserva. */
  onUnlock?: () => void;
  onPay?: () => void;
  onCancel?: () => void;
  onFinish?: () => void;
};

/**
 * Tarjeta de una reserva: vehículo, dónde está (hub + «Cómo llegar»), estado del prepago y la
 * acción que toca: Desbloquear (pagada), Pagar prepago (sin pagar), Finalizar (en viaje).
 */
export function ReservationCard({
  reservation: r,
  vehicle,
  hub,
  busy,
  onUnlock,
  onPay,
  onCancel,
  onFinish,
}: Props) {
  const open = isOpenReservation(r);
  const paid = r.paid === true;
  const place =
    r.modality === "delivery"
      ? `Te lo llevamos a ${r.address ?? "tu dirección"}`
      : (hub?.name ?? "Vehículo en la calle: ubícalo en el mapa");

  return (
    <li
      data-testid={`reservation-${r.id}`}
      data-status={r.status}
      className={`rounded-2xl border bg-surface p-4 ${
        open ? "border-primary/40" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            {vehicle ? `${kindLabel[vehicle.kind]} · ${vehicle.model}` : r.vehicleId}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{r.vehicleId}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{r.id}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" aria-hidden />
              {new Date(r.createdAt).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {r.totalCost ? <span>· Total {formatCOP(r.totalCost)}</span> : null}
          </p>
        </div>
        <Badge variant={statusVariant[r.status]} data-testid="reservation-badge">
          {r.status === "requested"
            ? paid
              ? "Lista para desbloquear"
              : "Falta el pago"
            : statusLabel[r.status]}
        </Badge>
      </div>

      {open && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2" data-testid="reservation-place">
            <MapPin className="size-4 shrink-0 text-primary-glow" aria-hidden />
            <span>{place}</span>
          </p>
          {r.status === "requested" && (
            <p
              className="flex items-center gap-2 text-xs"
              data-testid="reservation-payment"
              data-paid={paid}
            >
              {paid ? (
                <>
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                  <span>Prepago pagado ({formatCOP(10_000)}). Ya puedes desbloquearlo.</span>
                </>
              ) : (
                <>
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  <span>
                    Prepago de {formatCOP(10_000)} pendiente: sin pagarlo no se puede desbloquear.
                  </span>
                </>
              )}
            </p>
          )}
          {r.status === "active" && (
            <p className="text-xs text-muted-foreground">
              Viaje en curso. Devuélvelo en un hub y finaliza para ver el cobro.
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.status === "requested" && paid && (
            <Button
              size="lg"
              className="flex-1 basis-full sm:basis-auto"
              disabled={busy}
              onClick={onUnlock}
              data-testid={`reservation-unlock-${r.id}`}
            >
              <LockOpen className="mr-2 size-5" aria-hidden /> Desbloquear
            </Button>
          )}
          {r.status === "requested" && !paid && (
            <Button
              size="lg"
              className="flex-1 basis-full sm:basis-auto"
              disabled={busy}
              onClick={onPay}
              data-testid={`reservation-pay-${r.id}`}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Pagar prepago
            </Button>
          )}
          {r.status === "active" && (
            <Button
              size="lg"
              className="flex-1 basis-full sm:basis-auto"
              disabled={busy}
              onClick={onFinish}
              data-testid={`reservation-finish-${r.id}`}
            >
              Finalizar viaje
            </Button>
          )}
          {r.status === "requested" && r.modality === "hub" && vehicle && (
            <Button asChild variant="secondary" size="lg">
              <a
                href={directionsUrl(vehicle.lat, vehicle.lng)}
                target="_blank"
                rel="noreferrer"
                data-testid={`reservation-directions-${r.id}`}
              >
                <Navigation className="mr-2 size-4" aria-hidden /> Cómo llegar
              </a>
            </Button>
          )}
          {r.status === "requested" && (
            <Button
              size="lg"
              variant="ghost"
              disabled={busy}
              onClick={onCancel}
              data-testid={`reservation-cancel-${r.id}`}
            >
              Cancelar
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
