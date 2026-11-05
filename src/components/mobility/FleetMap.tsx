import "leaflet/dist/leaflet.css";

import type { Circle, CircleMarker, DivIcon, Map as LeafletMap, Marker, Polyline } from "leaflet";
import { useEffect, useRef, useState } from "react";

import type { Hub, Vehicle, VehicleKind } from "@/lib/data/types";
import { alertLabel, kindLabel } from "@/lib/format";
import { batteryLevel, CITY_CENTER, HUB_COVERAGE_M, type LatLng } from "@/lib/geo";

// Mapa interactivo multicapa (RF-06, RF-08). Leaflet + teselas OpenStreetMap/CARTO, solo en el cliente.
// Es presentacional: recibe datos por props y avisa selecciones por callbacks (RNF-10).

export type MapLayers = { vehicles: boolean; hubs: boolean; sale: boolean; coverage: boolean };

/** Punto al que el mapa debe volar; `key` cambia para repetir el vuelo al mismo sitio. */
export type MapFocus = LatLng & { zoom?: number; key: number };

const CENTER: [number, number] = [CITY_CENTER.lat, CITY_CENTER.lng];
const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS: Record<VehicleKind | "hub", string> = {
  scooter: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  bike: svg(
    '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  ),
  drone: svg(
    '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  ),
  hub: svg(
    '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  ),
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Props = {
  vehicles: Vehicle[];
  hubs: Hub[];
  layers: MapLayers;
  selectedHubId?: string | undefined;
  selectedVehicleId?: string | undefined;
  /** Posición del usuario (punto azul + círculo de precisión). */
  userPos?: (LatLng & { accuracy?: number }) | null | undefined;
  /** Vuelo animado hacia un punto. */
  focus?: MapFocus | null | undefined;
  /** Línea punteada que se dibuja desde el usuario hasta el vehículo elegido. */
  route?: { from: LatLng; to: LatLng } | null | undefined;
  onSelectHub: (hubId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onCenterChange?: (center: LatLng) => void;
  onReady?: () => void;
};

/** Clase y retraso de entrada: solo durante la primera carga, escalonado ~60 ms por marcador. */
function enterAttr(s: { enterUntil: number; enterCount: number }) {
  if (Date.now() > s.enterUntil) return { cls: "", style: "" };
  const delay = Math.min(s.enterCount++ * 0.06, 0.9);
  return { cls: "is-enter", style: `--enter-delay:${delay.toFixed(2)}s` };
}

export default function FleetMap({
  vehicles,
  hubs,
  layers,
  selectedHubId,
  selectedVehicleId,
  userPos,
  focus,
  route,
  onSelectHub,
  onSelectVehicle,
  onCenterChange,
  onReady,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const state = useRef<{
    L?: typeof import("leaflet");
    map?: LeafletMap;
    vehicleMarkers: Map<string, Marker>;
    hubMarkers: Map<string, Marker>;
    coverage: Map<string, Circle>;
    sigs: Map<string, string>;
    user?: CircleMarker;
    accuracy?: Circle;
    route?: Polyline;
    /** Hasta este instante los marcadores nuevos entran en cascada (solo la primera carga). */
    enterUntil: number;
    enterCount: number;
  }>({
    enterUntil: 0,
    enterCount: 0,
    vehicleMarkers: new Map(),
    hubMarkers: new Map(),
    coverage: new Map(),
    sigs: new Map(),
  });
  const handlers = useRef({ onSelectHub, onSelectVehicle, onCenterChange });
  handlers.current = { onSelectHub, onSelectVehicle, onCenterChange };

  // Inicialización (una vez)
  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((mod) => {
      const L = (mod as unknown as { default?: typeof import("leaflet") }).default ?? mod;
      if (disposed || !el.current) return;
      const map = L.map(el.current, {
        center: CENTER,
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      });
      // Proveedor de teselas configurable por .env (VITE_MAP_TILES_URL, VITE_MAP_API_KEY, VITE_MAP_ATTRIBUTION).
      // Por defecto OpenStreetMap (sin clave); el tema oscuro se aplica por CSS.
      const key = (import.meta.env["VITE_MAP_API_KEY"] as string | undefined) ?? "";
      const tiles = (
        (import.meta.env["VITE_MAP_TILES_URL"] as string | undefined) ??
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      ).replace("{key}", key);
      L.tileLayer(tiles, {
        maxZoom: 19,
        attribution:
          (import.meta.env["VITE_MAP_ATTRIBUTION"] as string | undefined) ??
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on("moveend", () => {
        const c = map.getCenter();
        handlers.current.onCenterChange?.({ lat: c.lat, lng: c.lng });
      });
      state.current.L = L;
      state.current.map = map;
      state.current.enterUntil = Date.now() + 1800;
      setReady(true);
      onReady?.();
    });
    const s = state.current;
    return () => {
      disposed = true;
      s.map?.remove();
      delete s.map;
      s.vehicleMarkers.clear();
      s.hubMarkers.clear();
      s.coverage.clear();
      s.sigs.clear();
      delete s.user;
      delete s.accuracy;
      delete s.route;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hubs + stock de venta (capas "hubs" y "sale")
  useEffect(() => {
    const { L, map, hubMarkers } = state.current;
    if (!ready || !L || !map) return;
    const wanted = new Set(layers.hubs || layers.sale ? hubs.map((h) => h.id) : []);
    for (const [id, m] of hubMarkers) {
      if (!wanted.has(id)) {
        m.remove();
        hubMarkers.delete(id);
      }
    }
    for (const [hi, h] of hubs.entries()) {
      if (!wanted.has(h.id)) continue;
      const saleCount = vehicles.filter((v) => v.mode === "sale" && v.hubId === h.id).length;
      const occ = h.capacity > 0 ? Math.min(100, Math.round((h.occupied / h.capacity) * 100)) : 0;
      const enter = enterAttr(state.current);
      const icon: DivIcon = L.divIcon({
        className: "umh-marker",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: `<button type="button" data-testid="hub-marker-${h.id}" aria-label="${escapeHtml(h.name)}, ${h.occupied} de ${h.capacity} puestos ocupados${h.active ? "" : " (inactivo)"}" aria-pressed="${selectedHubId === h.id}" class="umh-hub ${selectedHubId === h.id ? "is-selected" : ""} ${h.active ? "" : "is-inactive"} ${enter.cls}" style="--pulse-delay:${(hi * 0.9).toFixed(1)}s;${enter.style}">${ICONS.hub}<span class="umh-occ" aria-hidden="true"><i style="width:${occ}%"></i></span>${
          layers.sale && saleCount > 0
            ? `<span class="umh-sale" data-testid="sale-badge-${h.id}" title="${saleCount} en venta">${saleCount}</span>`
            : ""
        }</button>`,
      });
      const sig = `${selectedHubId === h.id}|${h.active}|${layers.sale}|${saleCount}|${occ}`;
      const existing = hubMarkers.get(h.id);
      if (existing) {
        if (state.current.sigs.get(`h:${h.id}`) !== sig) existing.setIcon(icon);
      } else {
        const m = L.marker([h.lat, h.lng], { icon, keyboard: false, title: h.name }).addTo(map);
        m.on("click", () => handlers.current.onSelectHub(h.id));
        hubMarkers.set(h.id, m);
      }
      state.current.sigs.set(`h:${h.id}`, sig);
    }
  }, [ready, hubs, vehicles, layers.hubs, layers.sale, selectedHubId]);

  // Vehículos de alquiler (capa "vehicles"); setLatLng en vivo
  useEffect(() => {
    const { L, map, vehicleMarkers } = state.current;
    if (!ready || !L || !map) return;
    const rentals = layers.vehicles ? vehicles.filter((v) => v.mode === "rent") : [];
    const wanted = new Set(rentals.map((v) => v.id));
    for (const [id, m] of vehicleMarkers) {
      if (!wanted.has(id)) {
        m.remove();
        vehicleMarkers.delete(id);
      }
    }
    for (const v of rentals) {
      const bad = v.alert !== "ok";
      const level = batteryLevel(v.battery);
      const enter = enterAttr(state.current);
      // Anillo de batería: el arco coloreado es el porcentaje que queda (alta/media/baja).
      const icon = L.divIcon({
        className: "umh-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        html: `<button type="button" data-testid="vehicle-marker-${v.id}" data-alert="${v.alert}" data-battery="${level}" aria-pressed="${selectedVehicleId === v.id}" aria-label="${escapeHtml(kindLabel[v.kind])} ${v.id}, batería ${v.battery}%${bad ? `, alerta: ${alertLabel[v.alert]}` : ""}" class="umh-vehicle bat-${level} ${bad ? "is-alert" : ""} ${selectedVehicleId === v.id ? "is-selected" : ""} ${enter.cls}" style="--bat:${Math.max(0, Math.min(100, v.battery))};${enter.style}"><span class="umh-core">${ICONS[v.kind]}</span></button>`,
      });
      const sig = `${v.alert}|${selectedVehicleId === v.id}|${Math.round(v.battery)}`;
      const existing = vehicleMarkers.get(v.id);
      if (existing) {
        existing.setLatLng([v.lat, v.lng]);
        if (state.current.sigs.get(`v:${v.id}`) !== sig) existing.setIcon(icon);
      } else {
        const m = L.marker([v.lat, v.lng], {
          icon,
          keyboard: false,
          title: `${kindLabel[v.kind]} ${v.id}`,
        }).addTo(map);
        m.on("click", () => handlers.current.onSelectVehicle(v.id));
        vehicleMarkers.set(v.id, m);
      }
      state.current.sigs.set(`v:${v.id}`, sig);
    }
  }, [ready, vehicles, layers.vehicles, selectedVehicleId]);

  // Zonas de cobertura de los hubs activos (capa "coverage")
  useEffect(() => {
    const { L, map, coverage } = state.current;
    if (!ready || !L || !map) return;
    const wanted = new Set(layers.coverage ? hubs.filter((h) => h.active).map((h) => h.id) : []);
    for (const [id, c] of coverage) {
      if (!wanted.has(id)) {
        c.remove();
        coverage.delete(id);
      }
    }
    for (const h of hubs) {
      if (!wanted.has(h.id) || coverage.has(h.id)) continue;
      const c = L.circle([h.lat, h.lng], {
        radius: HUB_COVERAGE_M,
        className: "umh-coverage",
        interactive: false,
      }).addTo(map);
      c.bringToBack();
      coverage.set(h.id, c);
    }
  }, [ready, hubs, layers.coverage]);

  // Posición del usuario
  useEffect(() => {
    const s = state.current;
    const { L, map } = s;
    if (!ready || !L || !map) return;
    if (!userPos) {
      s.user?.remove();
      s.accuracy?.remove();
      delete s.user;
      delete s.accuracy;
      return;
    }
    const ll: [number, number] = [userPos.lat, userPos.lng];
    if (!s.user) {
      s.accuracy = L.circle(ll, {
        radius: userPos.accuracy ?? 30,
        className: "umh-accuracy",
        interactive: false,
      }).addTo(map);
      s.user = L.circleMarker(ll, { radius: 8, className: "umh-user", interactive: false }).addTo(
        map,
      );
    } else {
      s.user.setLatLng(ll);
      s.accuracy?.setLatLng(ll).setRadius(userPos.accuracy ?? 30);
    }
  }, [ready, userPos]);

  // Ruta hasta el vehículo elegido: se redibuja (y se anima) cuando cambia el destino.
  useEffect(() => {
    const s = state.current;
    const { L, map } = s;
    if (!ready || !L || !map) return;
    s.route?.remove();
    delete s.route;
    if (!route) return;
    s.route = L.polyline(
      [
        [route.from.lat, route.from.lng],
        [route.to.lat, route.to.lng],
      ],
      { className: "umh-route", interactive: false },
    ).addTo(map);
  }, [ready, route?.from.lat, route?.from.lng, route?.to.lat, route?.to.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vuelo animado al punto pedido
  useEffect(() => {
    const { map } = state.current;
    if (!ready || !map || !focus) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const zoom = Math.max(map.getZoom(), focus.zoom ?? 15);
    if (reduce) map.setView([focus.lat, focus.lng], zoom);
    else map.flyTo([focus.lat, focus.lng], zoom, { duration: 0.6 });
  }, [ready, focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div
        ref={el}
        className="absolute inset-0 bg-background"
        data-testid="fleet-map"
        role="region"
        aria-label="Mapa de flota y hubs"
      />
    </>
  );
}
