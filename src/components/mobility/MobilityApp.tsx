import { AnimatePresence, motion } from "framer-motion";
import {
  BatteryCharging,
  ChevronUp,
  CircleHelp,
  Footprints,
  LocateFixed,
  MapPin,
  Navigation,
  Package,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Timer,
  User as UserIcon,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { GuidedTour, type TourStep } from "@/components/common/GuidedTour";
import { SoundToggle } from "@/components/common/SoundToggle";
import { VehicleIcon } from "@/components/common/vehicle-icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { BuyDialog, ReserveDialog } from "@/components/commerce/CommerceDialogs";
import type { MapFocus, MapLayers } from "@/components/mobility/FleetMap";
import { MapHeader } from "@/components/mobility/MapHeader";
import { MobileNav } from "@/components/mobility/MobileNav";
import { UnlockFlow } from "@/components/mobility/UnlockFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFleetLive, useHubs, useMe, useVehicles } from "@/lib/data/queries";
import type { RentalModality, Vehicle, VehicleKind } from "@/lib/data/types";
import { formatCOP, kindLabel } from "@/lib/format";
import {
  batteryLevel,
  CITY_CENTER,
  distanceM,
  formatDistance,
  nearest,
  walkMinutes,
  type LatLng,
} from "@/lib/geo";
import { playSound } from "@/lib/sound";

// El mapa solo existe en el navegador (Leaflet usa window): se carga bajo demanda.
const FleetMap = lazy(() => import("@/components/mobility/FleetMap"));

type Mode = "rent" | "buy";
type KindFilter = VehicleKind | "all";

const KIND_FILTERS: [KindFilter, string][] = [
  ["all", "Todos"],
  ["scooter", "Patinetas"],
  ["bike", "Bicicletas"],
  ["drone", "Drones"],
];
const BATTERY_FILTERS: [number, string][] = [
  [0, "Cualquiera"],
  [50, "50 % o más"],
  [80, "80 % o más"],
];

const TOUR_STEPS: TourStep[] = [
  {
    title: "Te mostramos el mapa en 1 minuto",
    body: "Son siete pasos cortos sobre los controles reales. Puedes saltarlo y volver a verlo con el botón de ayuda.",
  },
  {
    target: '[data-tour="mode"]',
    title: "Alquilar o comprar",
    body: "Alquilar muestra los vehículos que puedes usar por minuto. Comprar abre el catálogo de venta de cada hub.",
  },
  {
    target: '[data-tour="submode"]',
    title: "Recógelo o te lo llevamos",
    body: "En un hub lo recoges tú. A domicilio solo aparecen los vehículos que podemos llevarte, y se marcan las zonas que cubrimos.",
  },
  {
    target: '[data-tour="legend"]',
    title: "Cómo leer los marcadores",
    body: "El anillo de cada vehículo es su batería: verde alta, amarillo media, rojo baja. Los cuadrados azules son hubs, con su ocupación debajo. Si un vehículo late en rojo, tiene una alerta.",
  },
  {
    target: '[data-tour="actions"]',
    title: "Encuentra el más cercano",
    body: "Usa tu ubicación y te llevamos al vehículo disponible más cerca, con la distancia y los minutos caminando.",
  },
  {
    target: '[data-tour="filters"]',
    title: "Filtra lo que ves",
    body: "Elige tipo de vehículo, batería mínima y qué capas mostrar en el mapa.",
  },
  {
    target: '[data-tour="account"]',
    title: "Tus reservas",
    body: "Aquí ves tus reservas y terminas el viaje. Para desbloquear, toca un vehículo: QR, casco y listo.",
  },
];

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
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [minBattery, setMinBattery] = useState(0);
  const [userPos, setUserPos] = useState<(LatLng & { accuracy?: number }) | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>(CITY_CENTER);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [locating, setLocating] = useState(false);
  const [tourSignal, setTourSignal] = useState(0);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const hubs = hubsQ.data ?? [];
  const vehicles = useMemo(() => vehiclesQ.data ?? [], [vehiclesQ.data]);
  const hub = hubs.find((h) => h.id === hubId) ?? null;
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const rentals = vehicles.filter((v) => v.mode === "rent");
  const forSale = vehicles.filter((v) => v.mode === "sale");
  const visibleRentals = rentals.filter(
    (v) =>
      (submode === "delivery" ? v.delivery : true) &&
      (kindFilter === "all" || v.kind === kindFilter) &&
      v.battery >= minBattery,
  );
  // El mapa recibe el stock de venta completo y solo los vehículos de alquiler que pasan los filtros.
  const mapVehicles = useMemo(
    () => [...forSale, ...visibleRentals],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles, submode, kindFilter, minBattery],
  );
  const filtersActive = kindFilter !== "all" || minBattery > 0;
  const alerts = rentals.filter((v) => v.alert !== "ok").length;

  const layers: MapLayers = {
    vehicles: layerOverride.vehicles ?? mode === "rent",
    hubs: layerOverride.hubs ?? true,
    sale: layerOverride.sale ?? mode === "buy",
    coverage: layerOverride.coverage ?? (mode === "rent" && submode === "delivery"),
  };

  const activeHubs = hubs.filter((h) => h.active).length;
  const avgBattery = rentals.length
    ? Math.round(rentals.reduce((sum, v) => sum + v.battery, 0) / rentals.length)
    : 0;
  const n = visibleRentals.filter((v) => v.alert === "ok" && v.status === "available").length;
  const tickerMessages = [
    {
      text: `${n} ${n === 1 ? "vehículo listo" : "vehículos listos"} para alquilar`,
    },
    { text: `${activeHubs} hubs activos en la ciudad` },
    { text: `Batería media de la flota: ${avgBattery} %` },
    ...(alerts > 0
      ? [
          {
            text: `${alerts} ${alerts === 1 ? "vehículo con alerta" : "vehículos con alerta"}`,
            tone: "alert" as const,
          },
        ]
      : []),
  ];

  const origin = userPos ?? mapCenter;
  const vehicleDistance = vehicle ? distanceM(origin, vehicle) : null;
  const route =
    userPos && vehicle && vehicle.mode === "rent" ? { from: userPos, to: vehicle } : null;

  const flyTo = (p: LatLng, zoom?: number) =>
    setFocus({ ...p, ...(zoom ? { zoom } : {}), key: Date.now() });

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Tu navegador no comparte la ubicación. Mueve el mapa hasta tu zona.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        // Fuera de Bucaramanga (demo): se avisa en vez de volar a otra ciudad sin flota.
        if (distanceM(p, CITY_CENTER) > 30_000) {
          toast("Estás fuera de Bucaramanga", {
            description: "La flota de la demo está en Bucaramanga; usamos el centro de la ciudad.",
          });
          setUserPos({ ...CITY_CENTER, accuracy: 60 });
          flyTo(CITY_CENTER, 15);
          return;
        }
        setUserPos(p);
        flyTo(p, 16);
        playSound("locate");
      },
      () => {
        setLocating(false);
        playSound("error");
        toast.error("No pudimos obtener tu ubicación", {
          description:
            "Revisa el permiso de ubicación del navegador. Mientras, usamos el centro del mapa.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const findNearest = () => {
    if (mode !== "rent") setMode("rent");
    const candidates = visibleRentals.filter((v) => v.alert === "ok" && v.status === "available");
    const best = nearest(origin, candidates);
    if (!best) {
      playSound("error");
      toast("No hay vehículos disponibles con estos filtros", {
        description: "Quita algún filtro o cambia de modalidad.",
      });
      return;
    }
    setHubId(null);
    setVehicleId(best.item.id);
    flyTo(best.item, 16);
    playSound("locate");
  };

  const closePanels = () => {
    setHubId(null);
    setVehicleId(null);
  };
  const toggleLayer = (k: keyof MapLayers) => setLayerOverride((o) => ({ ...o, [k]: !layers[k] }));

  const loading = hubsQ.isPending || vehiclesQ.isPending;
  const error = hubsQ.isError || vehiclesQ.isError;
  const sheet =
    "absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-border bg-surface p-5 shadow-panel md:inset-x-auto md:bottom-4 md:left-4 md:w-[420px] md:rounded-3xl md:border";

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-background"
      data-testid="app-root"
    >
      {/* Mapa */}
      {isClient && (
        <Suspense
          fallback={
            <div className="absolute inset-0 map-grid" data-testid="map-loading" aria-hidden />
          }
        >
          <FleetMap
            vehicles={mapVehicles}
            hubs={hubs}
            layers={layers}
            selectedHubId={hubId ?? undefined}
            selectedVehicleId={vehicleId ?? undefined}
            userPos={userPos}
            focus={focus}
            route={route}
            onCenterChange={setMapCenter}
            onSelectHub={(id) => {
              playSound("tap");
              setVehicleId(null);
              setHubId(id);
              const h = hubs.find((x) => x.id === id);
              if (h) flyTo(h);
            }}
            onSelectVehicle={(id) => {
              playSound("tap");
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
            <EmptyState
              title="Aún no hay hubs ni vehículos"
              hint="Cuando el operador los registre aparecerán aquí."
              testId="app-empty"
            />
          )}
        </div>
      )}

      {/* Controles superiores */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-3 p-4 md:left-auto md:right-0 md:w-[420px]">
        <MapHeader
          live={live}
          messages={tickerMessages}
          left={<MobileNav />}
          right={
            <div className="flex gap-1.5" data-tour="account">
              {me?.role === "operator" && (
                <Button
                  asChild
                  size="icon"
                  variant="secondary"
                  className="rounded-full border border-border bg-surface-elevated/90 backdrop-blur"
                >
                  <Link to="/admin" aria-label="Panel del operador" data-testid="app-link-admin">
                    <Settings className="size-5" aria-hidden />
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="icon"
                variant="secondary"
                className="rounded-full border border-border bg-surface-elevated/90 backdrop-blur"
              >
                <Link
                  to={me ? "/mis-reservas" : "/login"}
                  aria-label={me ? "Mis reservas" : "Ingresar"}
                  data-testid="app-link-account"
                >
                  <UserIcon className="size-5" aria-hidden />
                </Link>
              </Button>
            </div>
          }
        />

        {/* Alquilar / Comprar */}
        <div
          role="group"
          aria-label="Modo"
          data-tour="mode"
          className="pointer-events-auto rounded-full border border-border bg-surface-elevated/95 p-1 backdrop-blur"
        >
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
                  if (mode !== value) playSound("toggle");
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

        <div className="pointer-events-auto flex gap-2" data-tour="submode">
          {mode === "rent" &&
            (
              [
                ["hub", "Recoger en hub", MapPin],
                ["delivery", "A domicilio", Package],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                data-testid={`submode-${value}`}
                aria-pressed={submode === value}
                onClick={() => {
                  if (submode !== value) playSound("toggle");
                  setSubmode(value);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium backdrop-blur transition-colors ${
                  submode === value
                    ? "border-primary bg-primary/20 text-foreground"
                    : "border-border bg-surface/80 text-muted-foreground"
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
            className="relative ml-auto shrink-0 rounded-full border border-border bg-surface-elevated/90"
            aria-label="Filtros y capas del mapa"
            aria-expanded={layersOpen}
            onClick={() => {
              playSound("toggle");
              setLayersOpen((o) => !o);
            }}
            data-testid="map-layers-toggle"
            data-tour="filters"
          >
            <SlidersHorizontal className="size-4" />
            {filtersActive && (
              <span
                className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary-glow ring-2 ring-background"
                aria-label="Hay filtros activos"
              />
            )}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {layersOpen && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "top right" }}
              className="pointer-events-auto space-y-3 rounded-2xl border border-border bg-surface-elevated/95 p-4 backdrop-blur"
              data-testid="map-filters"
            >
              <ChipGroup label="Tipo de vehículo">
                {KIND_FILTERS.map(([k, label]) => (
                  <Chip
                    key={k}
                    active={kindFilter === k}
                    onClick={() => setKindFilter(k)}
                    testId={`filter-kind-${k}`}
                  >
                    {k !== "all" && <VehicleIcon kind={k} className="size-3.5" />}
                    {label}
                  </Chip>
                ))}
              </ChipGroup>
              <ChipGroup label="Batería mínima">
                {BATTERY_FILTERS.map(([n, label]) => (
                  <Chip
                    key={n}
                    active={minBattery === n}
                    onClick={() => setMinBattery(n)}
                    testId={`filter-battery-${n}`}
                  >
                    {label}
                  </Chip>
                ))}
              </ChipGroup>
              <ChipGroup label="Capas del mapa">
                {(
                  [
                    ["vehicles", "Vehículos"],
                    ["hubs", "Hubs"],
                    ["sale", "Stock en venta"],
                    ["coverage", "Zonas de cobertura"],
                  ] as const
                ).map(([k, label]) => (
                  <Chip
                    key={k}
                    active={layers[k]}
                    onClick={() => toggleLayer(k)}
                    testId={`map-layer-${k}`}
                  >
                    {label}
                  </Chip>
                ))}
              </ChipGroup>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setKindFilter("all");
                    setMinBattery(0);
                  }}
                  className="text-xs text-primary-glow underline-offset-4 hover:underline"
                >
                  Quitar filtros
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Acciones del mapa: ubicación, más cercano y ayuda */}
      <div
        className="absolute bottom-6 right-4 z-20 flex flex-col items-end gap-2"
        data-tour="actions"
      >
        <SoundToggle className="rounded-full border border-border bg-surface-elevated/95 shadow-panel backdrop-blur" />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={() => setTourSignal((n) => n + 1)}
          aria-label="Ver tutorial del mapa"
          className="rounded-full border border-border bg-surface-elevated/95 shadow-panel backdrop-blur"
          data-testid="tour-open"
        >
          <CircleHelp className="size-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={locate}
          disabled={locating}
          aria-label={locating ? "Buscando tu ubicación" : "Ir a mi ubicación"}
          className="rounded-full border border-border bg-surface-elevated/95 shadow-panel backdrop-blur"
          data-testid="btn-locate"
        >
          <LocateFixed
            className={`size-5 ${locating ? "animate-pulse text-primary-glow" : ""} ${userPos ? "text-primary-glow" : ""}`}
          />
        </Button>
        <Button
          type="button"
          onClick={findNearest}
          disabled={loading}
          className="rounded-full bg-gradient-primary px-4 shadow-glow"
          data-testid="btn-nearest"
        >
          <Navigation className="mr-1.5 size-4" aria-hidden />
          Más cercano
        </Button>
      </div>

      {/* Leyenda en vivo (escritorio) */}
      <div
        className="absolute bottom-6 right-44 z-10 hidden w-64 rounded-2xl border border-border bg-surface-elevated/95 p-4 text-xs shadow-panel backdrop-blur lg:block"
        data-tour="legend"
        data-testid="map-legend"
      >
        <p className="flex items-center gap-2 font-medium">
          <span className="relative flex size-2">
            {live && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
            )}
            <span
              className={`relative inline-flex size-2 rounded-full ${live ? "bg-success" : "bg-muted-foreground"}`}
            />
          </span>
          {n} {n === 1 ? "vehículo disponible" : "vehículos disponibles"} para alquilar
          {alerts > 0 && <span className="text-destructive">· {alerts} con alerta</span>}
        </p>
        <ul className="mt-3 space-y-1.5 text-muted-foreground">
          <LegendRow color="var(--success)">Batería alta (50 % o más)</LegendRow>
          <LegendRow color="var(--warning)">Batería media (20–49 %)</LegendRow>
          <LegendRow color="var(--destructive)">Batería baja o alerta</LegendRow>
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-[4px] bg-gradient-primary" aria-hidden />
            Hub, con su ocupación debajo
          </li>
        </ul>
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
            <PanelHeader
              title={hub.name}
              subtitle={`${hub.zone} · ${hub.id}`}
              onClose={closePanels}
            />
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
                <Progress
                  value={(hub.occupied / hub.capacity) * 100}
                  className="mt-2"
                  aria-label="Ocupación del hub"
                />
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BatteryCharging className="size-3.5 text-success" aria-hidden />
                  <span data-testid="hub-charging">{hub.charging}</span> vehículos en carga
                </p>
              </div>
              <HubList
                title="Disponibles para alquiler"
                items={rentals.filter((v) => v.hubId === hub.id)}
                action={(v) => (
                  <Button
                    size="sm"
                    onClick={() => setUnlocking(v)}
                    data-testid={`btn-unlock-${v.id}`}
                  >
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
            <PanelHeader
              title={`${kindLabel[vehicle.kind]} · ${vehicle.model}`}
              subtitle={vehicle.id}
              onClose={closePanels}
            />
            {vehicleDistance !== null && (
              <Rise i={1}>
                <p
                  className="mt-3 flex items-center gap-1.5 text-sm text-foreground"
                  data-testid="vehicle-distance"
                >
                  <Footprints className="size-4 text-primary-glow" aria-hidden />A{" "}
                  {formatDistance(vehicleDistance)} · {walkMinutes(vehicleDistance)} min caminando
                  {!userPos && (
                    <span className="text-xs text-muted-foreground">
                      (desde el centro del mapa)
                    </span>
                  )}
                </p>
              </Rise>
            )}
            <Rise i={2} className="mt-4 grid grid-cols-2 gap-3">
              <BatteryStat value={vehicle.battery} />
              <Stat label="Tarifa" value={`${formatCOP(vehicle.pricePerMinute ?? 0)} / min`} />
            </Rise>
            <p className="mt-3 text-xs text-muted-foreground">{vehicle.spec}</p>
            {vehicle.alert !== "ok" && (
              <p className="mt-2 text-xs text-destructive" role="status">
                Este vehículo reporta una alerta y no está disponible.
              </p>
            )}
            <Rise i={3} className="mt-4 grid grid-cols-2 gap-2">
              <ReserveDialog
                vehicle={vehicle}
                redirectTo="/app"
                defaultModality={submode}
                trigger={
                  <Button
                    variant="secondary"
                    disabled={vehicle.alert !== "ok"}
                    data-testid={`btn-reserve-${vehicle.id}`}
                  >
                    Reservar
                  </Button>
                }
              />
              <Button
                disabled={vehicle.alert !== "ok"}
                onClick={() => setUnlocking(vehicle)}
                data-testid={`btn-unlock-${vehicle.id}`}
              >
                Desbloquear
              </Button>
            </Rise>
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
                <ChevronUp
                  className={`size-4 transition-transform ${catalogOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </span>
            </button>
            <div
              data-testid="catalog-list"
              className="max-h-[58dvh] space-y-3 overflow-y-auto px-5 pb-8"
            >
              {loading && <LoadingState rows={2} />}
              {!loading && forSale.length === 0 && (
                <EmptyState
                  title="No hay vehículos en venta"
                  hint="Vuelve pronto: el catálogo se actualiza a diario."
                />
              )}
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
                      <span className="text-base font-bold text-primary-glow">
                        {formatCOP(v.price ?? 0)}
                      </span>
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

      <AnimatePresence>
        {unlocking && <UnlockFlow vehicle={unlocking} onClose={() => setUnlocking(null)} />}
      </AnimatePresence>

      {isClient && !loading && (
        <GuidedTour
          storageKey="umh-tour-app-v1"
          steps={TOUR_STEPS}
          openSignal={tourSignal}
          finishLabel="Buscar el más cercano"
          onFinish={findNearest}
        />
      )}
    </div>
  );
}

/** Bloque que entra escalonado dentro de una hoja (orden `i`, ~50 ms entre bloques). */
function Rise({
  i,
  className,
  children,
}: {
  i: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 + i * 0.05 }}
    >
      {children}
    </motion.div>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      data-testid={testId}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary-glow ${
        active
          ? "border-primary bg-primary/20 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LegendRow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="size-3 rounded-full border-[3px]"
        style={{ borderColor: color }}
        aria-hidden
      />
      {children}
    </li>
  );
}

function BatteryStat({ value }: { value: number }) {
  const level = batteryLevel(value);
  const color = level === "high" ? "bg-success" : level === "mid" ? "bg-warning" : "bg-destructive";
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <p className="text-[11px] text-muted-foreground">Batería</p>
      <p
        className={`mt-1 text-base font-semibold tabular-nums ${level === "low" ? "text-destructive" : "text-foreground"}`}
      >
        {value}%
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold">{title}</h2>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Cerrar panel"
        data-testid="panel-close"
      >
        <X className="size-5" />
      </Button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-base font-semibold ${accent ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function HubList({
  title,
  items,
  action,
}: {
  title: string;
  items: Vehicle[];
  action: (v: Vehicle) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">
        {title} ({items.length})
      </h3>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin unidades en este punto.</p>
      )}
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
              {v.mode === "rent"
                ? `${v.battery}% batería · ${formatCOP(v.pricePerMinute ?? 0)}/min`
                : formatCOP(v.price ?? 0)}
            </p>
          </div>
          {action(v)}
        </div>
      ))}
    </div>
  );
}
