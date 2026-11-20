import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import {
  isOpenReservation,
  ReservationCard,
  sortReservations,
} from "@/components/mobility/ReservationCard";
import { UnlockFlow } from "@/components/mobility/UnlockFlow";
import { Button } from "@/components/ui/button";
import { getDataSource } from "@/lib/data";
import type { Hub, Reservation, Vehicle } from "@/lib/data/types";
import {
  keys,
  useAuthActions,
  useHubs,
  useMe,
  usePurchases,
  useReservations,
  useVehicles,
} from "@/lib/data/queries";
import { formatCOP } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { seo } from "@/lib/site";

const transitionMessage = {
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
  const vehiclesQ = useVehicles();
  const hubsQ = useHubs();
  const { logout } = useAuthActions();
  const [unlocking, setUnlocking] = useState<Vehicle | null>(null);
  const qc = useQueryClient();

  const [acting, setActing] = useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.reservations });
    void qc.invalidateQueries({ queryKey: keys.vehicles });
  };
  const pay = async (id: string) => {
    if (acting) return;
    setActing(true);
    try {
      await getDataSource().payReservation(id);
      refresh();
      toast.success("Prepago aprobado: ya puedes desbloquear el vehículo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo procesar el pago");
    } finally {
      setActing(false);
    }
  };
  const act = async (id: string, event: "finish" | "cancel") => {
    if (acting) return;
    setActing(true);
    try {
      await getDataSource().transitionReservation(id, event);
      refresh();
      toast.success(transitionMessage[event]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la reserva");
    } finally {
      setActing(false);
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
                  <ReservationLists
                    reservations={sortReservations(resQ.data)}
                    vehicles={vehiclesQ.data ?? []}
                    hubs={hubsQ.data ?? []}
                    acting={acting}
                    onUnlock={setUnlocking}
                    onPay={(id) => void pay(id)}
                    onAct={(id, ev) => void act(id, ev)}
                  />
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
      {unlocking && (
        <UnlockFlow
          vehicle={unlocking}
          onClose={() => {
            setUnlocking(null);
            refresh();
          }}
        />
      )}
    </SiteLayout>
  );
}

function ReservationLists({
  reservations,
  vehicles,
  hubs,
  acting,
  onUnlock,
  onPay,
  onAct,
}: {
  reservations: Reservation[];
  vehicles: Vehicle[];
  hubs: Hub[];
  acting: boolean;
  onUnlock: (v: Vehicle) => void;
  onPay: (id: string) => void;
  onAct: (id: string, event: "finish" | "cancel") => void;
}) {
  const open = reservations.filter(isOpenReservation);
  const history = reservations.filter((r) => !isOpenReservation(r));
  const card = (r: Reservation) => {
    const vehicle = vehicles.find((v) => v.id === r.vehicleId);
    return (
      <ReservationCard
        key={r.id}
        reservation={r}
        vehicle={vehicle}
        hub={hubs.find((h) => h.id === vehicle?.hubId)}
        busy={acting}
        onUnlock={() => vehicle && onUnlock(vehicle)}
        onPay={() => onPay(r.id)}
        onCancel={() => onAct(r.id, "cancel")}
        onFinish={() => onAct(r.id, "finish")}
      />
    );
  };
  return (
    <div className="space-y-4">
      {open.length > 0 ? (
        <ul className="space-y-3" data-testid="reservation-open">
          {open.map(card)}
        </ul>
      ) : (
        <EmptyState title="No tienes reservas abiertas" hint="Reserva un vehículo desde el mapa." />
      )}
      {history.length > 0 && (
        <details data-testid="reservation-history" className="rounded-2xl border border-border p-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Historial ({history.length}): completadas y canceladas
          </summary>
          <ul className="mt-3 space-y-3">{history.map(card)}</ul>
        </details>
      )}
    </div>
  );
}
