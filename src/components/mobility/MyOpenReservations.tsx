import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { isOpenReservation, ReservationCard, sortReservations } from "./ReservationCard";
import { getDataSource } from "@/lib/data";
import { keys, useHubs, useMe, useReservations, useVehicles } from "@/lib/data/queries";
import type { Vehicle } from "@/lib/data/types";

/**
 * Panel del mapa con las reservas abiertas del cliente (máx. 2): dónde está el vehículo,
 * si el prepago está pagado y el botón de desbloqueo de ESA reserva.
 */
export function MyOpenReservations({ onUnlock }: { onUnlock: (v: Vehicle) => void }) {
  const { data: me } = useMe();
  const resQ = useReservations(!!me);
  const vehiclesQ = useVehicles();
  const hubsQ = useHubs();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);

  const open = sortReservations(resQ.data ?? []).filter(isOpenReservation);
  if (!me || open.length === 0) return null;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.reservations });
    void qc.invalidateQueries({ queryKey: keys.vehicles });
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      refresh();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  };

  const ds = getDataSource();
  return (
    <section
      aria-label="Mis reservas abiertas"
      data-testid="open-reservations"
      className="absolute left-3 right-3 top-36 z-20 max-h-[36dvh] md:left-auto md:right-4 md:top-52 md:max-h-[55dvh] overflow-y-auto rounded-2xl border border-border bg-surface/95 p-3 shadow-panel backdrop-blur md:w-96"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Mis reservas ({open.length})</h2>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Mostrar mis reservas" : "Ocultar mis reservas"}
          data-testid="open-reservations-toggle"
          className="rounded-full p-1 hover:bg-surface-elevated"
        >
          {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>
      {!collapsed && (
        <>
          <ul className="mt-2 space-y-2">
            {open.slice(0, 2).map((r) => {
              const vehicle = vehiclesQ.data?.find((v) => v.id === r.vehicleId);
              return (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  vehicle={vehicle}
                  hub={hubsQ.data?.find((h) => h.id === vehicle?.hubId)}
                  busy={busy}
                  onUnlock={() => vehicle && onUnlock(vehicle)}
                  onPay={() =>
                    void run(
                      () => ds.payReservation(r.id),
                      "Prepago aprobado: ya puedes desbloquear",
                    )
                  }
                  onCancel={() =>
                    void run(() => ds.transitionReservation(r.id, "cancel"), "Reserva cancelada")
                  }
                  onFinish={() =>
                    void run(() => ds.transitionReservation(r.id, "finish"), "Viaje finalizado")
                  }
                />
              );
            })}
          </ul>
          {open.length > 2 && (
            <Link to="/mis-reservas" className="mt-2 block text-xs underline">
              Ver las {open.length} reservas
            </Link>
          )}
        </>
      )}
    </section>
  );
}
