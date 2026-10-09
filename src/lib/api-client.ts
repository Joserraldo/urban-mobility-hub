import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getDataSource } from "@/lib/data";

/**
 * Cliente de los endpoints NUEVOS del alcance v2 (entregas UC14-UC17, notificaciones
 * UC19, couriers). Solo modo api (`npm run dev:api`): el mock de localStorage no
 * simula domiciliarios porque el punto del trabajo M3 era justamente el backend real.
 */

export type Delivery = {
  id: string;
  reservation_id: string;
  courier_id: string;
  status: "assigned" | "in_progress" | "delivered" | "late";
  deadline_at: number;
  assigned_at: number;
  delivered_at: number | null;
  reason: string | null;
  address?: string | null;
  user_id?: string;
  customer_name?: string;
  customer_email?: string;
  vehicle_model?: string;
  pickup_hub_name?: string;
};

export type Courier = { id: string; name: string; email: string; load: number };
export type PendingDelivery = {
  id: string;
  address: string | null;
  requested_at: number;
  vehicle_id: string;
  vehicle_model: string;
  customer_name: string;
  customer_email: string;
};
export type NotificationRow = {
  id: string;
  user_id: string;
  delivery_id: string | null;
  template: string;
  to_email: string;
  status: "queued" | "sent" | "failed" | "simulated";
  provider: string;
  created_at: number;
};

export const isApiMode = () => getDataSource().kind === "api";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { message?: string } | string } | null)?.error;
    throw new Error(typeof err === "string" ? err : (err?.message ?? `Error ${res.status}`));
  }
  return data as T;
}

const dk = {
  couriers: ["couriers"] as const,
  pending: ["pending-deliveries"] as const,
  deliveries: ["deliveries"] as const,
  notifications: ["notifications"] as const,
};

export const useCouriers = (enabled = true) =>
  useQuery({ queryKey: dk.couriers, queryFn: () => call<Courier[]>("/api/couriers"), enabled });

export const usePendingDeliveries = (enabled = true) =>
  useQuery({
    queryKey: dk.pending,
    queryFn: () => call<PendingDelivery[]>("/api/pending-deliveries"),
    enabled,
  });

export const useAllDeliveries = (enabled = true) =>
  useQuery({
    queryKey: dk.deliveries,
    queryFn: () => call<Delivery[]>("/api/deliveries?scope=all"),
    enabled,
    refetchInterval: 10_000,
  });

/** Bandeja del domiciliario (GET con su sesión; el servidor aísla por courier_id). */
export const useMyDeliveries = (enabled = true) =>
  useQuery({
    queryKey: dk.deliveries,
    queryFn: () => call<Delivery[]>("/api/deliveries"),
    enabled,
    refetchInterval: 8_000,
  });

export const useNotifications = (enabled = true) =>
  useQuery({
    queryKey: dk.notifications,
    queryFn: () => call<NotificationRow[]>("/api/notifications"),
    enabled,
    refetchInterval: 10_000,
  });

export function useAssignDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { reservationId: string; courierId: string; deadlineMinutes: number }) =>
      call<{ delivery: Delivery }>("/api/deliveries", { method: "POST", body: JSON.stringify(i) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dk.deliveries });
      void qc.invalidateQueries({ queryKey: dk.pending });
      void qc.invalidateQueries({ queryKey: dk.couriers });
    },
  });
}

export function useDeliveryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: { id: string; action: "start" | "deliver" | "late"; reason?: string }) =>
      call<Delivery>(`/api/deliveries/${i.id}`, {
        method: "POST",
        body: JSON.stringify({ action: i.action, ...(i.reason ? { reason: i.reason } : {}) }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dk.deliveries });
      void qc.invalidateQueries({ queryKey: dk.notifications });
    },
  });
}
