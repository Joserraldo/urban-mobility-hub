import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getDataSource } from "./index";
import type {
  ActiveAlertType,
  AlertEvent,
  FleetEvent,
  LoginInput,
  RegisterInput,
  Vehicle,
} from "./types";

const ds = () => getDataSource();

export const keys = {
  hubs: ["hubs"] as const,
  vehicles: ["vehicles"] as const,
  alerts: ["alerts"] as const,
  me: ["me"] as const,
  reservations: ["reservations"] as const,
  purchases: ["purchases"] as const,
};

export const useHubs = () => useQuery({ queryKey: keys.hubs, queryFn: () => ds().listHubs() });
export const useVehicles = () =>
  useQuery({ queryKey: keys.vehicles, queryFn: () => ds().listVehicles() });
export const useAlerts = () => useQuery({ queryKey: keys.alerts, queryFn: () => ds().listAlerts() });
export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => ds().me(), staleTime: 60_000 });
export const useReservations = (enabled = true) =>
  useQuery({ queryKey: keys.reservations, queryFn: () => ds().listReservations(), enabled });
export const usePurchases = (enabled = true) =>
  useQuery({ queryKey: keys.purchases, queryFn: () => ds().listPurchases(), enabled });

/** Suscribe la UI al flujo en vivo (RF-08, RF-17). Mapa y panel comparten la misma caché = misma fuente de datos. */
export function useFleetLive() {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  useEffect(() => {
    const unsub = ds().subscribeFleet((e: FleetEvent) => {
      if (e.type === "position") {
        qc.setQueryData<Vehicle[]>(keys.vehicles, (old) =>
          old?.map((v) => (v.id === e.vehicleId ? { ...v, lat: e.lat, lng: e.lng } : v)),
        );
      } else if (e.type === "vehicle") {
        qc.setQueryData<Vehicle[]>(keys.vehicles, (old) => {
          if (!old) return old;
          return old.some((v) => v.id === e.vehicle.id)
            ? old.map((v) => (v.id === e.vehicle.id ? e.vehicle : v))
            : [...old, e.vehicle];
        });
      } else {
        qc.setQueryData<AlertEvent[]>(keys.alerts, (old) =>
          old?.some((a) => a.id === e.alert.id) ? old : [e.alert, ...(old ?? [])],
        );
      }
    });
    setLive(true);
    return () => {
      unsub();
      setLive(false);
    };
  }, [qc]);
  return live;
}

export function useAuthActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.me });
  return {
    login: useMutation({ mutationFn: (i: LoginInput) => ds().login(i), onSuccess: refresh }),
    register: useMutation({ mutationFn: (i: RegisterInput) => ds().register(i), onSuccess: refresh }),
    logout: useMutation({
      mutationFn: () => ds().logout(),
      onSuccess: () => {
        qc.setQueryData(keys.me, null);
        qc.removeQueries({ queryKey: keys.reservations });
        qc.removeQueries({ queryKey: keys.purchases });
      },
    }),
  };
}

export function useTriggerAlert() {
  return useMutation({
    mutationFn: (i: { vehicleId: string; type: ActiveAlertType }) => ds().triggerAlert(i),
  });
}
