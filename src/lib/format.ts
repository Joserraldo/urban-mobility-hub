import type { ActiveAlertType, AlertType, ReservationStatus, VehicleKind } from "./data/types";

export const kindLabel: Record<VehicleKind, string> = {
  scooter: "Patineta eléctrica",
  bike: "Bicicleta eléctrica",
  drone: "Dron de carga",
};

export const kindPlural: Record<VehicleKind, string> = {
  scooter: "Patinetas eléctricas",
  bike: "Bicicletas eléctricas",
  drone: "Drones de carga",
};

export const alertLabel: Record<AlertType, string> = {
  ok: "Sin novedad",
  "no-helmet": "Sin casco",
  crash: "Caída / impacto",
  "gps-lost": "Pérdida de señal GPS",
  "low-battery": "Batería crítica",
};

export const activeAlertTypes: ActiveAlertType[] = [
  "no-helmet",
  "crash",
  "gps-lost",
  "low-battery",
];

export const statusLabel: Record<ReservationStatus, string> = {
  requested: "Solicitada",
  active: "Activa",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const formatCoords = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const vehicleSlug = (v: { id: string; model: string }) =>
  `${slugify(v.model)}-${v.id.toLowerCase()}`;
export const vehicleIdFromSlug = (slug: string) =>
  slug.match(/([a-z]{2}-\d+)$/)?.[1]?.toUpperCase() ?? slug.toUpperCase();
