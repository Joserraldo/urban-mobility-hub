// Fuente única de datos (mock) leída por el mapa y el dashboard de telemetría.

export type VehicleKind = "scooter" | "bike" | "drone";
export type VehicleMode = "rent" | "sale";
export type IotAlert = "ok" | "no-helmet" | "crash" | "gps-lost" | "low-battery";

export type Hub = {
  id: string;
  name: string;
  zone: string;
  x: number; // % horizontal sobre el mapa
  y: number; // % vertical sobre el mapa
  capacity: number;
  occupied: number;
  charging: number;
  active: boolean;
};

export type Vehicle = {
  id: string;
  kind: VehicleKind;
  model: string;
  mode: VehicleMode;
  battery: number;
  pricePerMinute?: number;
  price?: number;
  condition?: "nuevo" | "seminuevo";
  spec: string;
  hubId?: string;
  x: number;
  y: number;
  gps: string;
  alert: IotAlert;
  delivery?: boolean;
};

export const hubs: Hub[] = [
  {
    id: "HUB-01",
    name: "Hub Central",
    zone: "Centro Histórico",
    x: 32,
    y: 38,
    capacity: 40,
    occupied: 27,
    charging: 9,
    active: true,
  },
  {
    id: "HUB-02",
    name: "Hub Universidad",
    zone: "Campus Norte",
    x: 68,
    y: 24,
    capacity: 25,
    occupied: 18,
    charging: 6,
    active: true,
  },
  {
    id: "HUB-03",
    name: "Hub Río Sur",
    zone: "Parque Sur",
    x: 55,
    y: 74,
    capacity: 30,
    occupied: 11,
    charging: 4,
    active: true,
  },
  {
    id: "HUB-04",
    name: "Hub Aeropuerto",
    zone: "Zona Franca",
    x: 84,
    y: 58,
    capacity: 20,
    occupied: 14,
    charging: 3,
    active: false,
  },
];

export const vehicles: Vehicle[] = [
  // --- Alquiler: patinetas y bicis sueltas ---
  {
    id: "SC-1042",
    kind: "scooter",
    model: "Volt S2",
    mode: "rent",
    battery: 87,
    pricePerMinute: 450,
    spec: "Autonomía 32 km · 25 km/h",
    x: 22,
    y: 55,
    gps: "4.6512, -74.0561",
    alert: "ok",
  },
  {
    id: "SC-1088",
    kind: "scooter",
    model: "Volt S2",
    mode: "rent",
    battery: 64,
    pricePerMinute: 450,
    spec: "Autonomía 32 km · 25 km/h",
    x: 45,
    y: 30,
    gps: "4.6598, -74.0620",
    alert: "ok",
  },
  {
    id: "SC-1120",
    kind: "scooter",
    model: "Volt Pro",
    mode: "rent",
    battery: 19,
    pricePerMinute: 520,
    spec: "Autonomía 45 km · 30 km/h",
    x: 62,
    y: 48,
    gps: "4.6701, -74.0498",
    alert: "low-battery",
    hubId: "HUB-03",
  },
  {
    id: "BK-2201",
    kind: "bike",
    model: "Urban e-Bike",
    mode: "rent",
    battery: 92,
    pricePerMinute: 380,
    spec: "Pedaleo asistido · 60 km",
    x: 38,
    y: 62,
    gps: "4.6455, -74.0710",
    alert: "ok",
    delivery: true,
  },
  {
    id: "BK-2244",
    kind: "bike",
    model: "Urban e-Bike",
    mode: "rent",
    battery: 71,
    pricePerMinute: 380,
    spec: "Pedaleo asistido · 60 km",
    x: 74,
    y: 40,
    gps: "4.6820, -74.0455",
    alert: "ok",
    hubId: "HUB-02",
  },
  {
    id: "DR-3301",
    kind: "drone",
    model: "AeroLift 4",
    mode: "rent",
    battery: 58,
    pricePerMinute: 1200,
    spec: "Carga 5 kg · 22 min vuelo",
    x: 50,
    y: 16,
    gps: "4.6902, -74.0630",
    alert: "ok",
    delivery: true,
    hubId: "HUB-01",
  },
  {
    id: "DR-3315",
    kind: "drone",
    model: "AeroLift 4",
    mode: "rent",
    battery: 34,
    pricePerMinute: 1200,
    spec: "Carga 5 kg · 22 min vuelo",
    x: 28,
    y: 22,
    gps: "4.6944, -74.0812",
    alert: "gps-lost",
  },

  // --- Venta: stock en hubs ---
  {
    id: "SV-5001",
    kind: "scooter",
    model: "Volt S2 Edition",
    mode: "sale",
    battery: 100,
    price: 2890000,
    condition: "nuevo",
    spec: "500 W · 32 km · IPX5",
    hubId: "HUB-01",
    x: 32,
    y: 38,
    gps: "Hub Central",
    alert: "ok",
  },
  {
    id: "SV-5002",
    kind: "scooter",
    model: "Volt Pro",
    mode: "sale",
    battery: 96,
    price: 3750000,
    condition: "seminuevo",
    spec: "750 W · 45 km · susp. dual",
    hubId: "HUB-02",
    x: 68,
    y: 24,
    gps: "Hub Universidad",
    alert: "ok",
  },
  {
    id: "SV-5003",
    kind: "bike",
    model: "Urban e-Bike Lite",
    mode: "sale",
    battery: 100,
    price: 4200000,
    condition: "nuevo",
    spec: "250 W · 60 km · aluminio",
    hubId: "HUB-03",
    x: 55,
    y: 74,
    gps: "Hub Río Sur",
    alert: "ok",
  },
  {
    id: "SV-5004",
    kind: "drone",
    model: "AeroLift 4 Cargo",
    mode: "sale",
    battery: 100,
    price: 9800000,
    condition: "nuevo",
    spec: "Carga 5 kg · RTK GPS",
    hubId: "HUB-01",
    x: 32,
    y: 38,
    gps: "Hub Central",
    alert: "ok",
  },
];

export const kindLabel: Record<VehicleKind, string> = {
  scooter: "Patineta",
  bike: "Bici eléctrica",
  drone: "Dron",
};

export const alertLabel: Record<IotAlert, string> = {
  ok: "Sin alertas",
  "no-helmet": "Sin casco",
  crash: "Caída detectada",
  "gps-lost": "Señal GPS perdida",
  "low-battery": "Batería baja",
};

export const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const vehiclesForHub = (hubId: string, mode: VehicleMode) =>
  vehicles.filter((v) => v.hubId === hubId && v.mode === mode);

export const saleCatalog = vehicles.filter((v) => v.mode === "sale");
export const rentalVehicles = vehicles.filter((v) => v.mode === "rent");
