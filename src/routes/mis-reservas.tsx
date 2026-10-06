import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, LogOut } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDataSource } from "@/lib/data";
import type { ReservationStatus } from "@/lib/data/types";
import { keys, useAuthActions, useMe, usePurchases, useReservations } from "@/lib/data/queries";
import { formatCOP, statusLabel } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { seo } from "@/lib/site";

const statusVariant: Record<
  ReservationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  requested: "outline",
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
};

const transitionMessage = {
  start: "Viaje iniciado",
  finish: "Viaje finalizado",
  cancel: "Reserva cancelada",
} as const;

export const Route = createFileRoute("/mis-reservas")({
  head: () =>
    seo({
      title: "Mis reservas y compras",
      description: "Consulta tus reservas de alquiler y tus compras.",
      path: "/mis-reservas",
      noindex: true,
    }),
  component: MyReservations,
});

function MyReservations() {
  const meQ = useMe();
  const me = meQ.data;
  const resQ = useReservations(!!me);
  const purQ = usePurchases(!!me);
  const { logout } = useAuthActions();
  const qc = useQueryClient();

  const act = async (id: string, event: "start" | "finish" | "cancel") => {
    try {
      await getDataSource().transitionReservation(id, event);
      void qc.invalidateQueries({ queryKey: keys.reservations });
      toast.success(transitionMessage[event]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la reserva");
    }
  };

  return (
    <SiteLayout>
      <PageHeading
        title="Mis reservas y compras"
        lead={me ? `Sesión iniciada como ${me.email}` : undefined}
      />
      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-16 sm:px-6">
        {meQ.isPending ? (
          <LoadingState rows={2} />
        ) : !me ? (
          <EmptyState
            testId="reservations-login"
            title="Inicia sesión para ver tu actividad"
            action={
              <Link to="/login" search={{ redirect: "/mis-reservas" }}>
                <Button size="sm">Ingresar</Button>
              </Link>
            }
          />
        ) : (
          <>
            <section aria-labelledby="r-t">
              <h2 id="r-t" className="text-xl font-semibold">
                Reservas de alquiler
              </h2>
              <div className="mt-4" data-testid="reservation-list">
                {resQ.isPending ? (
                  <LoadingState rows={2} />
                ) : resQ.isError ? (
                  <ErrorState onRetry={() => void resQ.refetch()} />
                ) : resQ.data.length === 0 ? (
                  <EmptyState
                    title="Aún no tienes reservas"
                    hint="Reserva un vehículo desde el mapa."
                  />
                ) : (
                  <ul className="space-y-3">
                    {resQ.data.map((r) => (
                      <li
                        key={r.id}
                        data-testid={`reservation-${r.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
                      >
                        <div>
                          <p className="font-medium">
                            {r.vehicleId} · {r.modality === "delivery" ? "A domicilio" : "En hub"}
                          </p>
                          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>{r.id}</span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3" aria-hidden />
                              {new Date(r.createdAt).toLocaleDateString("es-CO", {
                                dateStyle: "medium",
                              })}
                            </span>
                            {r.totalCost ? <span>· Total {formatCOP(r.totalCost)}</span> : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                          {r.status === "requested" && (
                            <Button size="sm" onClick={() => void act(r.id, "start")}>
                              Iniciar
                            </Button>
                          )}
                          {r.status === "active" && (
                            <Button size="sm" onClick={() => void act(r.id, "finish")}>
                              Finalizar
                            </Button>
                          )}
                          {(r.status === "requested" || r.status === "active") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void act(r.id, "cancel")}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            <section aria-labelledby="p-t">
              <h2 id="p-t" className="text-xl font-semibold">
                Compras
              </h2>
              <div className="mt-4" data-testid="purchase-list">
                {purQ.isPending ? (
                  <LoadingState rows={1} />
                ) : purQ.isError ? (
                  <ErrorState
                    message="No pudimos cargar tus compras."
                    onRetry={() => void purQ.refetch()}
                  />
                ) : purQ.data && purQ.data.length > 0 ? (
                  <ul className="space-y-3">
                    {purQ.data.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between rounded-2xl border border-border bg-surface p-4 text-sm"
                      >
                        <span>
                          {p.vehicleId} · {p.id}
                        </span>
                        <strong className="text-primary-glow">{formatCOP(p.price)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="Aún no tienes compras" hint="Explora el catálogo de venta." />
                )}
              </div>
            </section>
            <Button
              variant="secondary"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "No se pudo cerrar la sesión"),
                })
              }
              data-testid="logout"
            >
              <LogOut className="mr-2 size-4" aria-hidden /> Cerrar sesión
            </Button>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
