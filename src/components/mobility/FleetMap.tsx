import "leaflet/dist/leaflet.css";

import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";

import type { Hub, Vehicle, VehicleKind } from "@/lib/data/types";
import { alertLabel, kindLabel } from "@/lib/format";

// Mapa interactivo multicapa (RF-06, RF-08). Leaflet + teselas OpenStreetMap/CARTO, solo en el cliente.
// Es presentacional: recibe datos por props y avisa selecciones por callbacks (RNF-10).

export type MapLayers = { vehicles: boolean; hubs: boolean; sale: boolean };

const CENTER: [number, number] = [7.1139, -73.1098]; // Bucaramanga
const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS: Record<VehicleKind | "hub", string> = {
  scooter: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  bike: svg('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>'),
  drone: svg('<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'),
  hub: svg('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Props = {
  vehicles: Vehicle[];
  hubs: Hub[];
  layers: MapLayers;
  selectedHubId?: string | undefined;
  selectedVehicleId?: string | undefined;
  onSelectHub: (hubId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onReady?: () => void;
};

export default function FleetMap({ vehicles, hubs, layers, selectedHubId, selectedVehicleId, onSelectHub, onSelectVehicle, onReady }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const state = useRef<{
    L?: typeof import("leaflet");
    map?: LeafletMap;
    vehicleMarkers: Map<string, Marker>;
    hubMarkers: Map<string, Marker>;
    sigs: Map<string, string>;
  }>({ vehicleMarkers: new Map(), hubMarkers: new Map(), sigs: new Map() });
  const handlers = useRef({ onSelectHub, onSelectVehicle });
  handlers.current = { onSelectHub, onSelectVehicle };

  // Inicialización (una vez)
  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((mod) => {
      const L = (mod as unknown as { default?: typeof import("leaflet") }).default ?? mod;
      if (disposed || !el.current) return;
      const map = L.map(el.current, { center: CENTER, zoom: 13, zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
      state.current.L = L;
      state.current.map = map;
      setReady(true);
      onReady?.();
    });
    const s = state.current;
    return () => {
      disposed = true;
      s.map?.remove();
      s.map = undefined;
      s.vehicleMarkers.clear();
      s.hubMarkers.clear();
      s.sigs.clear();
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
    for (const h of hubs) {
      if (!wanted.has(h.id)) continue;
      const saleCount = vehicles.filter((v) => v.mode === "sale" && v.hubId === h.id).length;
      const icon: DivIcon = L.divIcon({
        className: "umh-marker",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: `<button type="button" data-testid="hub-marker-${h.id}" aria-label="${escapeHtml(h.name)}${h.active ? "" : " (inactivo)"}" aria-pressed="${selectedHubId === h.id}" class="umh-hub ${selectedHubId === h.id ? "is-selected" : ""} ${h.active ? "" : "is-inactive"}">${ICONS.hub}${
          layers.sale && saleCount > 0 ? `<span class="umh-sale" data-testid="sale-badge-${h.id}" title="${saleCount} en venta">${saleCount}</span>` : ""
        }</button>`,
      });
      const sig = `${selectedHubId === h.id}|${h.active}|${layers.sale}|${saleCount}`;
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
      const icon = L.divIcon({
        className: "umh-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `<button type="button" data-testid="vehicle-marker-${v.id}" data-alert="${v.alert}" aria-label="${escapeHtml(kindLabel[v.kind])} ${v.id}${bad ? `, alerta: ${alertLabel[v.alert]}` : ""}" class="umh-vehicle ${bad ? "is-alert" : ""} ${selectedVehicleId === v.id ? "is-selected" : ""}">${ICONS[v.kind]}</button>`,
      });
      const sig = `${v.alert}|${selectedVehicleId === v.id}`;
      const existing = vehicleMarkers.get(v.id);
      if (existing) {
        existing.setLatLng([v.lat, v.lng]);
        if (state.current.sigs.get(`v:${v.id}`) !== sig) existing.setIcon(icon);
      } else {
        const m = L.marker([v.lat, v.lng], { icon, keyboard: false, title: `${kindLabel[v.kind]} ${v.id}` }).addTo(map);
        m.on("click", () => handlers.current.onSelectVehicle(v.id));
        vehicleMarkers.set(v.id, m);
      }
      state.current.sigs.set(`v:${v.id}`, sig);
    }
  }, [ready, vehicles, layers.vehicles, selectedVehicleId]);

  return <div ref={el} className="absolute inset-0 bg-background" data-testid="fleet-map" role="region" aria-label="Mapa de flota y hubs" />;
}
