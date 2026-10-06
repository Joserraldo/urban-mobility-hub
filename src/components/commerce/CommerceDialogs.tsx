import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDataSource } from "@/lib/data";
import { keys, useMe } from "@/lib/data/queries";
import {
  DataError,
  type Purchase,
  type RentalModality,
  type Reservation,
  type Vehicle,
} from "@/lib/data/types";
import { formatCOP, kindLabel, statusLabel } from "@/lib/format";

const messageOf = (e: unknown) =>
  e instanceof DataError || e instanceof Error ? e.message : "Error inesperado";

function LoginRequired({ redirectTo }: { redirectTo: string }) {
  return (
    <div
      data-testid="login-required"
      className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4 text-sm"
    >
      <p>Para continuar necesitas una cuenta.</p>
      <div className="flex gap-2">
        <Link to="/login" search={{ redirect: redirectTo }}>
          <Button size="sm">Ingresar</Button>
        </Link>
        <Link to="/registro" search={{ redirect: redirectTo }}>
          <Button size="sm" variant="secondary">
            Crear cuenta
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Compra en 2 pasos: abrir → confirmar (RF-03, RNF-07). */
export function BuyDialog({
  vehicle,
  hubName,
  trigger,
  redirectTo,
}: {
  vehicle: Vehicle;
  hubName: string | undefined;
  trigger: ReactNode;
  redirectTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: me } = useMe();
  const qc = useQueryClient();

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const purchase = await getDataSource().createPurchase(vehicle.id);
      setDone(purchase);
      void qc.invalidateQueries({ queryKey: keys.purchases });
      toast.success(`Compra confirmada: ${vehicle.model}`);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setDone(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent data-testid="checkout-dialog">
        <DialogHeader>
          <DialogTitle>Comprar {vehicle.model}</DialogTitle>
          <DialogDescription>
            {kindLabel[vehicle.kind]} · {vehicle.condition} · recogida en{" "}
            {hubName ?? "hub asignado"}
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div data-testid="purchase-status" className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
            <p className="font-semibold">¡Compra confirmada!</p>
            <p className="text-sm text-muted-foreground">
              Referencia {done.id}. Recoge tu vehículo en {hubName ?? "el hub"}. Puedes verla en
              «Mis reservas y compras».
            </p>
            <Link to="/mis-reservas">
              <Button variant="secondary">Ver mis compras</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary-glow">
                {formatCOP(vehicle.price ?? 0)}
              </span>
            </div>
            {!me && <LoginRequired redirectTo={redirectTo} />}
            {error && (
              <p role="alert" data-testid="checkout-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!me || busy}
              onClick={confirm}
              data-testid="checkout-confirm"
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Confirmar compra
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Reserva de alquiler: elegir modalidad → confirmar (RF-05). Estado visible tras confirmar. */
export function ReserveDialog({
  vehicle,
  trigger,
  redirectTo,
  defaultModality = "hub",
  onReserved,
}: {
  vehicle: Vehicle;
  trigger: ReactNode;
  redirectTo: string;
  defaultModality?: RentalModality;
  onReserved?: (r: Reservation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [modality, setModality] = useState<RentalModality>(
    defaultModality === "delivery" && vehicle.delivery ? "delivery" : "hub",
  );
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: me } = useMe();
  const qc = useQueryClient();

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const reservation = await getDataSource().createReservation({
        vehicleId: vehicle.id,
        modality,
        ...(modality === "delivery" ? { address } : {}),
      });
      setDone(reservation);
      onReserved?.(reservation);
      void qc.invalidateQueries({ queryKey: keys.reservations });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setDone(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent data-testid="reserve-dialog">
        <DialogHeader>
          <DialogTitle>Reservar {vehicle.model}</DialogTitle>
          <DialogDescription>
            {kindLabel[vehicle.kind]} · {formatCOP(vehicle.pricePerMinute ?? 0)} por minuto ·
            batería {vehicle.battery}%
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
            <p>
              Estado de la reserva:{" "}
              <strong data-testid="reservation-status" data-status={done.status}>
                {statusLabel[done.status]}
              </strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {done.modality === "delivery"
                ? `Te lo llevamos a ${done.address}.`
                : "Recógelo en su hub y desbloquéalo con el QR."}{" "}
              Referencia {done.id}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Modalidad</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["hub", "En un hub (estación a estación)"],
                    ["delivery", "A domicilio"],
                  ] as const
                ).map(([value, label]) => {
                  const disabled = value === "delivery" && !vehicle.delivery;
                  return (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
                        modality === value ? "border-primary bg-primary/10" : "border-border"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <input
                        type="radio"
                        name="modality"
                        value={value}
                        checked={modality === value}
                        disabled={disabled}
                        onChange={() => setModality(value)}
                        data-testid={`modality-${value}`}
                        className="accent-[var(--primary)]"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              {!vehicle.delivery && (
                <p className="text-xs text-muted-foreground">
                  Este vehículo no admite entrega a domicilio.
                </p>
              )}
            </fieldset>
            {modality === "delivery" && (
              <div className="space-y-1.5">
                <Label htmlFor="delivery-address">Dirección de entrega</Label>
                <Input
                  id="delivery-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle 36 # 27-10, Bucaramanga"
                  data-testid="delivery-address"
                />
              </div>
            )}
            {!me && <LoginRequired redirectTo={redirectTo} />}
            {error && (
              <p role="alert" data-testid="checkout-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!me || busy || (modality === "delivery" && !address.trim())}
              onClick={confirm}
              data-testid="checkout-confirm"
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Confirmar reserva
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
