import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/common/states";
import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { keys } from "@/lib/data/queries";
import { formatCOP } from "@/lib/format";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/pago/resultado")({
  validateSearch: (s: Record<string, unknown>): { order?: string } =>
    typeof s["order"] === "string" ? { order: s["order"] } : {},
  head: () =>
    seo({
      title: "Resultado del pago",
      description: "Estado de tu pago con Bold.",
      path: "/pago/resultado",
      noindex: true,
    }),
  component: PaymentResult,
});

type OrderStatus = {
  status: "pending" | "approved" | "rejected";
  kind: "base" | "cargo_viaje";
  ownerType: "purchase" | "reservation";
  amountCop: number;
  reason: string | null;
  checkoutUrl: string | null;
};

/** Cada cuánto se consulta y cuántas veces antes de decir "sigue en proceso" (~2 min). */
const POLL_MS = 3_000;
const MAX_POLLS = 40;

function PaymentResult() {
  const { order } = Route.useSearch();
  const qc = useQueryClient();
  const [data, setData] = useState<OrderStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const res = await fetch(`/api/payments/bold/${encodeURIComponent(order)}`, {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as OrderStatus;
        if (cancelled) return;
        setData(next);
        if (next.status !== "pending") {
          void qc.invalidateQueries({ queryKey: keys.reservations });
          void qc.invalidateQueries({ queryKey: keys.purchases });
          return;
        }
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      polls += 1;
      if (polls >= MAX_POLLS) {
        if (!cancelled) setGaveUp(true);
        return;
      }
      timer = setTimeout(() => void tick(), POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [order, qc]);

  const what =
    data?.kind === "cargo_viaje"
      ? "tu viaje"
      : data?.ownerType === "purchase"
        ? "tu compra"
        : "tu reserva";

  return (
    <SiteLayout>
      <PageHeading title="Resultado del pago" />
      <div
        className="mx-auto max-w-xl space-y-6 px-4 pb-16 sm:px-6"
        data-testid="payment-result"
        aria-live="polite"
      >
        {!order || failed ? (
          <Panel
            icon={<XCircle className="size-8 text-destructive" aria-hidden />}
            title="No encontramos este pago"
          >
            Inicia sesión con la cuenta que hizo el pago y revisa tu actividad.
          </Panel>
        ) : !data ? (
          <LoadingState rows={1} />
        ) : data.status === "approved" ? (
          <Panel
            icon={<CheckCircle2 className="size-8 text-primary" aria-hidden />}
            title="¡Pago aprobado!"
          >
            Recibimos {formatCOP(data.amountCop)} y confirmamos {what}.
          </Panel>
        ) : data.status === "rejected" ? (
          <Panel
            icon={<XCircle className="size-8 text-destructive" aria-hidden />}
            title="El pago no se completó"
          >
            {data.reason ?? "El pago fue rechazado o el enlace venció."} No se cobró nada.
          </Panel>
        ) : (
          <Panel
            icon={<Clock className="size-8 text-muted-foreground" aria-hidden />}
            title="Esperando la confirmación de Bold"
          >
            {gaveUp
              ? "Bold aún no confirma el pago. Si ya pagaste, revisa en unos minutos “Mis reservas”."
              : "Esto toma solo unos segundos. No cierres esta página."}
            {data.checkoutUrl ? (
              <span className="mt-3 block">
                <Button asChild variant="outline" size="sm">
                  <a href={data.checkoutUrl}>Volver al pago</a>
                </Button>
              </span>
            ) : null}
          </Panel>
        )}
        <Button asChild>
          <Link to="/mis-reservas">Ir a mis reservas</Link>
        </Button>
      </div>
    </SiteLayout>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-4 rounded-2xl border border-border bg-surface p-6">
      {icon}
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-muted-foreground">{children}</p>
      </div>
    </section>
  );
}
