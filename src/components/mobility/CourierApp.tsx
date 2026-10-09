import { Bike, CheckCircle2, Clock, Loader2, MapPin, PhoneCall } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { isApiMode, useDeliveryAction, useMyDeliveries, type Delivery } from "@/lib/api-client";
import { useMe } from "@/lib/data/queries";

const STATUS: Record<Delivery["status"], { label: string; cls: string }> = {
  assigned: { label: "Asignada", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  in_progress: { label: "En camino", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  delivered: {
    label: "Entregada",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  late: { label: "Tardía", cls: "border-red-500/40 bg-red-500/10 text-red-300" },
};

function remaining(deadline: number): { text: string; danger: boolean } {
  const ms = deadline - Date.now();
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  return ms < 0
    ? { text: `vencida hace ${m} min`, danger: true }
    : { text: `faltan ${m}:${String(s).padStart(2, "0")} min`, danger: m < 10 };
}

/** Bandeja del DOMICILIARIO (UC15/UC16/UC17). Datos reales de `deliveries` (modo api). */
export function CourierApp() {
  const { data: me } = useMe();
  const api = isApiMode();
  const { data: deliveries, isLoading } = useMyDeliveries(api && me?.role === "courier");
  const action = useDeliveryAction();
  const [lateReason, setLateReason] = useState<Record<string, string>>({});

  if (!api)
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">
        La vista de domiciliario requiere el backend: ejecuta <code>npm run dev:api</code>.
      </div>
    );
  if (me?.role !== "courier")
    return (
      <div
        className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground"
        data-testid="courier-no-access"
      >
        Esta pantalla es solo para cuentas con rol <strong>domiciliario</strong>. En la demo:{" "}
        <code>domi1@demo.co</code> / <code>Demo1234!</code>
      </div>
    );

  const active = (deliveries ?? []).filter((d) => d.status !== "delivered");
  const done = (deliveries ?? []).filter((d) => d.status === "delivered");

  const run = (id: string, a: "start" | "deliver" | "late", reason?: string) => {
    action.mutate(
      { id, action: a, ...(reason ? { reason } : {}) },
      {
        onSuccess: (d) =>
          toast.success(
            `Entrega ${d.status === "late" ? "marcada tardía (aviso Brevo enviado)" : `en '${d.status}'`}`,
          ),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" data-testid="courier-app">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bike className="size-6 text-primary-glow" aria-hidden /> Mis entregas · {me.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          UC15-UC17: la bandeja lee la tabla <code>deliveries</code> filtrada por tu
          <code> courier_id</code>. Ordenada por vencimiento.
        </p>
      </header>

      {isLoading && <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />}

      {active.map((d) => {
        const rem = remaining(d.deadline_at);
        return (
          <article
            key={d.id}
            data-testid={`delivery-card-${d.id}`}
            className="space-y-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{d.vehicle_model}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden /> {d.address} · para {d.customer_name}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <PhoneCall className="size-4" aria-hidden /> {d.customer_email}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS[d.status].cls}`}
                data-status={d.status}
              >
                {STATUS[d.status].label}
              </span>
            </div>
            <p
              className={`flex items-center gap-1.5 text-sm ${rem.danger ? "text-destructive" : "text-muted-foreground"}`}
            >
              <Clock className="size-4" aria-hidden /> {rem.text}
              {d.status === "late" && d.reason ? ` · ${d.reason}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {d.status === "assigned" && (
                <Button
                  size="sm"
                  onClick={() => run(d.id, "start")}
                  disabled={action.isPending}
                  data-testid={`delivery-start-${d.id}`}
                >
                  Iniciar entrega
                </Button>
              )}
              {(d.status === "in_progress" || d.status === "late") && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    run(
                      d.id,
                      "deliver",
                      d.status === "late" ? (lateReason[d.id] ?? "recuperada") : undefined,
                    )
                  }
                  disabled={action.isPending}
                  data-testid={`delivery-done-${d.id}`}
                >
                  <CheckCircle2 className="mr-1 size-4" aria-hidden /> Confirmar entrega
                </Button>
              )}
              {(d.status === "assigned" || d.status === "in_progress") && (
                <div className="flex flex-1 gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm"
                    placeholder="Causa del retraso (obligatoria)"
                    value={lateReason[d.id] ?? ""}
                    onChange={(e) => setLateReason((r) => ({ ...r, [d.id]: e.target.value }))}
                    aria-label={`Causa de retraso de la entrega ${d.id}`}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!lateReason[d.id]?.trim() || action.isPending}
                    onClick={() => run(d.id, "late", lateReason[d.id]!)}
                    data-testid={`delivery-late-${d.id}`}
                  >
                    Marcar tardía
                  </Button>
                </div>
              )}
            </div>
          </article>
        );
      })}

      {active.length === 0 && !isLoading && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No tienes entregas activas. El operador asigna reservas de domicilio desde /admin (UC14).
        </p>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Entregadas ({done.length})
          </h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {done.slice(0, 6).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <span>
                  {d.vehicle_model} → {d.customer_name}
                </span>
                <span>
                  {d.delivered_at ? new Date(d.delivered_at).toLocaleTimeString("es-CO") : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
