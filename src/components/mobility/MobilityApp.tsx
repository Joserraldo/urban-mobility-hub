import { AnimatePresence, motion } from "framer-motion";
import {
  BatteryCharging,
  ChevronUp,
  Layers,
  MapPin,
  Package,
  Settings,
  ShoppingBag,
  Timer,
  User as UserIcon,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { VehicleIcon } from "@/components/common/vehicle-icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { BuyDialog, ReserveDialog } from "@/components/commerce/CommerceDialogs";
import type { MapLayers } from "@/components/mobility/FleetMap";
import { MobileNav } from "@/components/mobility/MobileNav";
import { UnlockFlow } from "@/components/mobility/UnlockFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFleetLive, useHubs, useMe, useVehicles } from "@/lib/data/queries";
import type { RentalModality, Vehicle } from "@/lib/data/types";
import { formatCOP, kindLabel } from "@/lib/format";

// El mapa solo existe en el navegador (Leaflet usa window): se carga bajo demanda.
const FleetMap = lazy(() => import("@/components/mobility/FleetMap"));

type Mode = "rent" | "buy";

export function MobilityApp() {
  const hubsQ = useHubs();
  const vehiclesQ = useVehicles();
  const { data: me } = useMe();
  const live = useFleetLive();

  const [mode, setMode] = useState<Mode>("rent");
  const [submode, setSubmode] = useState<RentalModality>("hub");
  const [hubId, setHubId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<Vehicle | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [layerOverride, setLayerOverride] = useState<Partial<MapLayers>>({});
  const [layersOpen, setLayersOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const hubs = hubsQ.data ?? [];
  const vehicles = useMemo(() => vehiclesQ.data ?? [], [vehiclesQ.data]);
  const hub = hubs.find((h) => h.id === hubId) ?? null;
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const rentals = vehicles.filter((v) => v.mode === "rent");
  const forSale = vehicles.filter((v) => v.mode === "sale");
  const visibleRentals = rentals.filter((v) => (submode === "delivery" ? v.delivery : true));

  const layers: MapLayers = {
    vehicles: layerOverride.vehicles ?? mode === "rent",
    hubs: layerOverride.hubs ?? true,
    sale: layerOverride.sale ?? mode === "buy",
  };

  const closePanels = () => {
    setHubId(null);
    setVehicleId(null);
  };
  const toggleLayer = (k: keyof MapLayers) => setLayerOverride((o) => ({ ...o, [k]: !layers[k] }));

  const loading = hubsQ.isPending || vehiclesQ.isPending;
  const error = hubsQ.isError || vehiclesQ.isError;
  const sheet = "absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-border bg-surface p-5 shadow-panel md:inset-x-auto md:bottom-4 md:left-4 md:w-[420px] md:rounded-3xl md:border";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background" data-testid="app-root">
      {/* Mapa */}
      {isClient && (
        <Suspense fallback={null}>
          <FleetMap
            vehicles={vehicles}
            hubs={hubs}
            layers={layers}
            selectedHubId={hubId ?? undefined}
            selectedVehicleId={vehicleId ?? undefined}
            onSelectHub={(id) => {
              setVehicleId(null);
              setHubId(id);
            }}
            onSelectVehicle={(id) => {
              setHubId(null);
              setVehicleId(id);
            }}
          />
        </Suspense>
      )}

      {(loading || error || (!loading && hubs.length === 0 && vehicles.length === 0)) && (
        <div className="absolute inset-x-4 top-1/2 z-10 mx-auto max-w-md -translate-y-1/2">
          {loading && <LoadingState rows={2} label="Cargando mapa y flota…" testId="app-loading" />}
          {error && (
            <ErrorState
              testId="app-error"
              message="No pudimos cargar la flota. Revisa tu conexión e inténtalo de nuevo."
              onRetry={() => {
                void hubsQ.refetch();
                void vehiclesQ.refetch();
              }}
            />
          )}
          {!loading && !error && hubs.length === 0 && vehicles.length === 0 && (
            <EmptyState title="Aún no hay hubs ni vehículos" hint="Cuando el operador los registre aparecerán aquí." testId="app-empty" />
          )}
        </div>
      )}

      {/* Controles superiores */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-3 p-4 md:left-auto md:right-0 md:w-[420px]">
        <div className="pointer-events-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <MobileNav />
          <div className="min-w-0 text-center">
            <h1 className="truncate text-sm font-semibold tracking-tight">NODO Mobility</h1>
            <p className="truncate text-[11px] text-muted-foreground" aria-live="polite">
              {hubs.filter((h) => h.active).length} hubs activos ·{" "}
              <span data-testid="live-indicator" data-live={live}>
                {live ? "en vivo" : "sin conexión en vivo"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {me?.role === "operator" && (
              <Link to="/admin" aria-label="Panel del operador" data-testid="app-link-admin">
                <Button size="icon" variant="secondary" className="rounded-full border border-border bg-surface-elevated/90 backdrop-blur">
                  <Settings className="size-5" />
                </Button>
              </Link>
            )}
            <Link to={me ? "/mis-reservas" : "/login"} aria-label={me ? "Mis reservas" : "Ingresar"} data-testid="app-link-account">
              <Button size="icon" variant="secondary" className="rounded-full border border-border bg-surface-elevated/90 backdrop-blur">
                <UserIcon className="size-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Alquilar / Comprar */}
        <div role="group" aria-label="Modo" className="pointer-events-auto rounded-full border border-border bg-surface-elevated/95 p-1 backdrop-blur">
          <div className="relative grid grid-cols-2">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-primary shadow-glow"
              style={{ left: mode === "rent" ? "0%" : "50%" }}
            />
            {(
              [
                ["rent", "Alquilar", Timer],
                ["buy", "Comprar", ShoppingBag],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                data-testid={`mode-${value}`}
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setLayerOverride({});
                  closePanels();
                  setCatalogOpen(value === "buy");
                }}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                  mode === value ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2">
          {mode === "rent" &&
            (
              [
                ["hub", "En punto / estación", MapPin],
                ["delivery", "A domicilio", Package],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                data-testid={`submode-${value}`}
                aria-pressed={submode === value}
                onClick={() => setSubmode(value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium backdrop-blur transition-colors ${
                  submode === value ? "border-primary bg-primary/20 text-foreground" : "border-border bg-surface/80 text-muted-foreground"
                }`}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="ml-auto shrink-0 rounded-full border border-border bg-surface-elevated/90"
            aria-label="Capas del mapa"
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen((o) => !o)}
            data-testid="map-layers-toggle"
          >
            <Layers className="size-4" />
          </Button>
        </div>

        {layersOpen && (
          <div role="group" aria-label="Capas del mapa" className="pointer-events-auto flex flex-wrap gap-2 rounded-2xl border border-border bg-surface-elevated/95 p-3 backdrop-blur">
            {(
              [
                ["vehicles", "Vehículos"],
                ["hubs", "Hubs"],
                ["sale", "Stock en venta"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                data-testid={`map-layer-${k}`}
                aria-pressed={layers[k]}
                onClick={() => toggleLayer(k)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  layers[k] ? "border-primary bg-primary/20" : "border-border text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panel de hub (RF-07) */}
      <AnimatePresence>
        {hub && (
          <motion.section
            key="hub-panel"
            aria-label={`Hub ${hub.name}`}
            data-testid="hub-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={`${sheet} max-h-[70dvh] overflow-y-auto`}
          >
            <PanelHeader title={hub.name} subtitle={`${hub.zone} · ${hub.id}`} onClose={closePanels} />
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Capacidad total</span>
                  <span data-testid="hub-capacity">{hub.capacity}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ocupados</span>
                  <span data-testid="hub-occupied">{hub.occupied}</span>
                </div>
                <Progress value={(hub.occupied / hub.capacity) * 100} className="mt-2" aria-label="Ocupación del hub" />
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BatteryCharging className="size-3.5 text-success" aria-hidden />
                  <span data-testid="hub-charging">{hub.charging}</span> vehículos en carga
                </p>
              </div>
              <HubList
                title="Disponibles para alquiler"
                items={rentals.filter((v) => v.hubId === hub.id)}
                action={(v) => (
                  <Button size="sm" onClick={() => setUnlocking(v)} data-testid={`btn-unlock-${v.id}`}>
                    Desbloquear
                  </Button>
                )}
              />
              <HubList
                title="Disponibles para compra"
                items={forSale.filter((v) => v.hubId === hub.id)}
                action={(v) => (
                  <BuyDialog
                    vehicle={v}
                    hubName={hub.name}
                    redirectTo="/app"
                    trigger={
                      <Button size="sm" variant="secondary" data-testid={`btn-buy-${v.id}`}>
                        Comprar
                      </Button>
                    }
                  />
                )}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Hoja de vehículo de alquiler */}
      <AnimatePresence>
        {vehicle && vehicle.mode === "rent" && (
          <motion.section
            key="vehicle-sheet"
            aria-label={`Vehículo ${vehicle.id}`}
            data-testid={`vehicle-card-${vehicle.id}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className={sheet}
          >
            <PanelHeader title={`${kindLabel[vehicle.kind]} · ${vehicle.model}`} subtitle={vehicle.id} onClose={closePanels} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Batería" value={`${vehicle.battery}%`} accent={vehicle.battery < 25} />
              <Stat label="Tarifa" value={`${formatCOP(vehicle.pricePerMinute ?? 0)} / min`} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{vehicle.spec}</p>
            {vehicle.alert !== "ok" && (
              <p className="mt-2 text-xs text-destructive" role="status">
                Este vehículo reporta una alerta y no está disponible.
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ReserveDialog
                vehicle={vehicle}
                redirectTo="/app"
                defaultModality={submode}
                trigger={
                  <Button variant="secondary" disabled={vehicle.alert !== "ok"} data-testid={`btn-reserve-${vehicle.id}`}>
                    Reservar
                  </Button>
                }
              />
              <Button disabled={vehicle.alert !== "ok"} onClick={() => setUnlocking(vehicle)} data-testid={`btn-unlock-${vehicle.id}`}>
                Desbloquear
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Catálogo de venta (modo comprar) — RF-02, RF-03 */}
      <AnimatePresence>
        {mode === "buy" && !hub && (
          <motion.section
            key="catalog"
            aria-label="Catálogo de venta"
            initial={{ y: "100%" }}
            animate={{ y: catalogOpen ? 0 : "calc(100% - 76px)" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="absolute inset-x-0 bottom-0 z-20 max-h-[72dvh] rounded-t-3xl border-t border-border bg-surface shadow-panel md:inset-x-auto md:bottom-4 md:left-4 md:w-[420px] md:rounded-3xl md:border"
          >
            <button
              type="button"
              onClick={() => setCatalogOpen((o) => !o)}
              aria-expanded={catalogOpen}
              data-testid="catalog-toggle"
              className="flex w-full items-center justify-between px-5 py-5"
            >
              <span className="text-sm font-semibold">Catálogo de venta</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {forSale.length} vehículos
                <ChevronUp className={`size-4 transition-transform ${catalogOpen ? "rotate-180" : ""}`} aria-hidden />
              </span>
            </button>
            <div data-testid="catalog-list" className="max-h-[58dvh] space-y-3 overflow-y-auto px-5 pb-8">
              {loading && <LoadingState rows={2} />}
              {!loading && forSale.length === 0 && <EmptyState title="No hay vehículos en venta" hint="Vuelve pronto: el catálogo se actualiza a diario." />}
              {forSale.map((v) => {
                const hubName = hubs.find((h) => h.id === v.hubId)?.name;
                return (
                  <article
                    key={v.id}
                    data-testid={`vehicle-card-${v.id}`}
                    className="rounded-2xl border border-border bg-surface-elevated p-4"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                        <VehicleIcon kind={v.kind} className="size-5 text-primary-glow" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{v.model}</h3>
                        <p className="text-xs text-muted-foreground">{v.spec}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {v.condition}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{hubName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-base font-bold text-primary-glow">{formatCOP(v.price ?? 0)}</span>
                      <BuyDialog
                        vehicle={v}
                        hubName={hubName}
                        redirectTo="/app"
                        trigger={
                          <Button size="sm" data-testid={`btn-buy-${v.id}`}>
                            Comprar
                          </Button>
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {mode === "rent" && !loading && !error && visibleRentals.length === 0 && (
        <p
          role="status"
          data-testid="rent-empty"
          className="absolute inset-x-4 bottom-6 z-10 mx-auto max-w-sm rounded-xl border border-border bg-surface/95 p-3 text-center text-xs text-muted-foreground"
        >
          No hay vehículos disponibles con este filtro.
        </p>
      )}

      <AnimatePresence>{unlocking && <UnlockFlow vehicle={unlocking} onClose={() => setUnlocking(null)} />}</AnimatePresence>
    </div>
  );
}

function PanelHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold">{title}</h2>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel" data-testid="panel-close">
        <X className="size-5" />
      </Button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold ${accent ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function HubList({ title, items, action }: { title: string; items: Vehicle[]; action: (v: Vehicle) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title} ({items.length})
      </h3>
      {items.length === 0 && <p className="text-xs text-muted-foreground">Sin unidades en este punto.</p>}
      {items.map((v) => (
        <div
          key={v.id}
          data-testid={`vehicle-card-${v.id}`}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3"
        >
          <VehicleIcon kind={v.kind} className="size-4 shrink-0 text-primary-glow" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{v.model}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {v.mode === "rent" ? `${v.battery}% batería · ${formatCOP(v.pricePerMinute ?? 0)}/min` : formatCOP(v.price ?? 0)}
            </p>
          </div>
          {action(v)}
        </div>
      ))}
    </div>
  );
}
