import { Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMaintenance, useMaintenanceActions } from "@/lib/data/queries";
import type { MaintenanceOrder, Vehicle } from "@/lib/data/types";
import { formatTime } from "@/lib/format";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const fmt = (ts: number) =>
  `${new Date(ts).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} ${formatTime(ts)}`;

/** Mantenimiento por vehículo: enviar a taller, cerrar órdenes e historial. */
export function MaintenancePanel({ vehicles }: { vehicles: Vehicle[] }) {
  const q = useMaintenance();
  const { send, close } = useMaintenanceActions();
  const [vehicleId, setVehicleId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  // Solo se puede retirar lo que no está en viaje, vendido ni ya en mantenimiento.
  const eligible = vehicles.filter(
    (v) => v.status !== "in_use" && v.status !== "sold" && v.status !== "maintenance",
  );
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !reason.trim()) return;
    send.mutate(
      { vehicleId, reason: reason.trim(), ...(notes.trim() ? { notes: notes.trim() } : {}) },
      {
        onSuccess: (r) => {
          toast.success(
            r.cancelled > 0
              ? `${vehicleId} en mantenimiento. Se cancelaron ${r.cancelled} reserva(s)`
              : `${vehicleId} en mantenimiento`,
          );
          setVehicleId("");
          setReason("");
          setNotes("");
        },
        onError: fail,
      },
    );
  };

  const closeOrder = (o: MaintenanceOrder) => {
    const resolution = (resolutions[o.id] ?? "").trim();
    if (!resolution) {
      toast.error("Escribe la resolución antes de cerrar la orden");
      return;
    }
    close.mutate(
      { orderId: o.id, resolution },
      { onSuccess: () => toast.success(`${o.vehicleId} disponible de nuevo`), onError: fail },
    );
  };

  return (
    <section
      aria-labelledby="mnt-t"
      data-testid="maintenance-panel"
      className="space-y-6 rounded-2xl border border-border bg-surface p-5"
    >
      <div>
        <h2 id="mnt-t" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Wrench className="size-4 text-primary-glow" aria-hidden />
          Mantenimiento
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Un vehículo en mantenimiento no se reserva, no se compra ni se ve en la app del cliente.
          Al enviarlo se cancelan sus reservas abiertas; al cerrar la orden vuelve a estar
          disponible con la alerta en orden.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" data-testid="maintenance-form">
        <div className="space-y-1.5">
          <Label htmlFor="mnt-vehicle" className="text-xs text-muted-foreground">
            Vehículo
          </Label>
          <select
            id="mnt-vehicle"
            className={selectClass}
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            data-testid="maintenance-vehicle"
          >
            <option value="">Elige un vehículo</option>
            {eligible.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id} · {v.model}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mnt-reason" className="text-xs text-muted-foreground">
            Motivo
          </Label>
          <Input
            id="mnt-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Llanta pinchada, batería degradada"
            data-testid="maintenance-reason"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="mnt-notes" className="text-xs text-muted-foreground">
            Notas (opcional)
          </Label>
          <Input id="mnt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={!vehicleId || !reason.trim() || send.isPending}
            data-testid="maintenance-send"
          >
            Enviar a mantenimiento
          </Button>
        </div>
      </form>

      {q.isPending ? (
        <LoadingState rows={2} label="Cargando órdenes…" />
      ) : q.isError ? (
        <ErrorState message="No pudimos cargar las órdenes." onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div>
            <h3 className="text-sm font-semibold">Órdenes abiertas ({q.data.open.length})</h3>
            {q.data.open.length === 0 ? (
              <EmptyState title="No hay vehículos en mantenimiento" />
            ) : (
              <ul className="mt-3 space-y-3" data-testid="maintenance-open">
                {q.data.open.map((o) => (
                  <li
                    key={o.id}
                    className="space-y-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {o.vehicleModel} · {o.vehicleId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.reason}
                      {o.notes ? ` · ${o.notes}` : ""} · abierta {fmt(o.openedAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        aria-label={`Resolución de ${o.id}`}
                        placeholder="Resolución (qué se hizo)"
                        className="min-w-0 flex-1"
                        value={resolutions[o.id] ?? ""}
                        onChange={(e) => setResolutions((r) => ({ ...r, [o.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        onClick={() => closeOrder(o)}
                        disabled={close.isPending}
                        data-testid={`maintenance-close-${o.id}`}
                      >
                        Cerrar orden
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Historial</h3>
            {q.data.closed.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Aún no hay órdenes cerradas.</p>
            ) : (
              <ul className="mt-3 space-y-2" data-testid="maintenance-history">
                {q.data.closed.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs"
                  >
                    <span className="font-medium">
                      {o.vehicleModel} · {o.vehicleId}
                    </span>{" "}
                    · {o.reason} → {o.resolution}
                    <span className="block text-muted-foreground">
                      {fmt(o.openedAt)} a {o.closedAt ? fmt(o.closedAt) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
