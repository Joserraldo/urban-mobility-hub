import { Mail, PackageOpen, Truck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  isApiMode,
  useAllDeliveries,
  useAssignDelivery,
  useCouriers,
  useNotifications,
  usePendingDeliveries,
} from "@/lib/api-client";

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

/**
 * Panel de ENTREGAS del operador (UC14) + bitácora de notificaciones Brevo (UC19).
 * Solo modo api: lee `deliveries`, `reservations` y `notifications` reales.
 */
export function DeliveriesPanel() {
  const api = isApiMode();
  const { data: pending = [] } = usePendingDeliveries(api);
  const { data: couriers = [] } = useCouriers(api);
  const { data: deliveries = [] } = useAllDeliveries(api);
  const { data: notifications = [] } = useNotifications(api);
  const assign = useAssignDelivery();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [minutes, setMinutes] = useState(45);

  if (!api)
    return (
      <section className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Entregas a domicilio: activa el backend (<code>npm run dev:api</code>) para asignar
        domiciliarios reales (UC14-UC19).
      </section>
    );

  const doAssign = (reservationId: string) => {
    const courierId = chosen[reservationId] ?? couriers[0]?.id;
    if (!courierId) {
      toast.error("No hay domiciliarios registrados");
      return;
    }
    assign.mutate(
      { reservationId, courierId, deadlineMinutes: minutes },
      {
        onSuccess: (r) =>
          toast.success(`Entrega ${r.delivery.id} asignada · deadline ${minutes} min`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const open = deliveries.filter((d) => d.status !== "delivered");

  return (
    <section className="space-y-6" data-testid="deliveries-panel" aria-labelledby="deliv-t">
      <h2 id="deliv-t" className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <Truck className="size-5 text-primary-glow" aria-hidden /> Entregas a domicilio (UC14)
      </h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PackageOpen className="size-4" aria-hidden /> Reservas de domicilio esperando
            asignación
          </h3>
          {pending.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nada pendiente: todas las entregas están asignadas.
            </p>
          )}
          {pending.map((r) => (
            <div
              key={r.id}
              data-testid={`pending-${r.id}`}
              className="space-y-2 rounded-xl border border-border/70 p-3 text-sm"
            >
              <p className="font-medium">
                {r.vehicle_model} → {r.customer_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.address} · solicitada {new Date(r.requested_at).toLocaleTimeString("es-CO")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-border bg-transparent px-2 py-1 text-xs"
                  value={chosen[r.id] ?? couriers[0]?.id ?? ""}
                  onChange={(e) => setChosen((c) => ({ ...c, [r.id]: e.target.value }))}
                  aria-label={`Domiciliario para ${r.id}`}
                  data-testid={`courier-select-${r.id}`}
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.load} activas
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  deadline
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value) || 45)}
                    className="w-14 rounded border border-border bg-transparent px-1 py-0.5"
                    aria-label="Minutos de deadline"
                  />
                  min
                </label>
                <Button
                  size="sm"
                  disabled={assign.isPending || couriers.length === 0}
                  onClick={() => doAssign(r.id)}
                  data-testid={`assign-${r.id}`}
                >
                  <UserPlus className="mr-1 size-3.5" aria-hidden /> Asignar
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold">Entregas en curso</h3>
          {open.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin entregas abiertas.</p>
          )}
          <ul className="space-y-2 text-sm">
            {open.map((d) => (
              <li
                key={d.id}
                data-testid={`delivery-row-${d.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
              >
                <span className="truncate">
                  {d.vehicle_model} · {d.customer_name} →{" "}
                  <strong className={d.status === "late" ? "text-destructive" : ""}>
                    {d.status}
                  </strong>
                  {d.reason ? ` (${d.reason})` : ""}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  vence {new Date(d.deadline_at).toLocaleTimeString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="size-4" aria-hidden /> Bitácora de correos Brevo (UC19)
        </h3>
        {notifications.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Sin avisos todavía. Marca una entrega como tardía (o espera al cron) y verás aquí el
            registro con estado <code>sent/simulated/failed</code>.
          </p>
        )}
        <ul className="space-y-1 text-sm">
          {notifications.slice(0, 8).map((n) => (
            <li
              key={n.id}
              data-testid={`notification-${n.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs"
            >
              <span>
                {n.template} → {n.to_email}
              </span>
              <span
                className={
                  n.status === "sent"
                    ? "text-emerald-400"
                    : n.status === "failed"
                      ? "text-destructive"
                      : "text-amber-300"
                }
              >
                {n.status}
                {n.status === "simulated" ? " (sin clave Brevo: se muestra, no se envía)" : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Montos demo: prepago reserva {money(10_000)} COP · cargo de viaje = ceil(minutos) ×
          tarifa.
        </p>
      </div>
    </section>
  );
}
