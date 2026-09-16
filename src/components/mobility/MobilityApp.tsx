import { AnimatePresence, motion } from "framer-motion";
import {
  BatteryCharging,
  Bike,
  ChevronUp,
  Home,
  MapPin,
  Package,
  Plane,
  Settings,
  ShoppingBag,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { MobileNav } from "@/components/mobility/MobileNav";
import { UnlockFlow } from "@/components/mobility/UnlockFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  formatCOP,
  hubs,
  kindLabel,
  rentalVehicles,
  saleCatalog,
  vehiclesForHub,
  type Hub,
  type Vehicle,
  type VehicleKind,
} from "@/lib/fleet-data";

type Mode = "rent" | "buy";
type RentSubmode = "hub" | "delivery";

const kindIcon: Record<VehicleKind, typeof Bike> = {
  scooter: Zap,
  bike: Bike,
  drone: Plane,
};

export function MobilityApp() {
  const [mode, setMode] = useState<Mode>("rent");
  const [submode, setSubmode] = useState<RentSubmode>("hub");
  const [hub, setHub] = useState<Hub | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [unlocking, setUnlocking] = useState<Vehicle | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const visibleRentals = rentalVehicles.filter((v) => (submode === "delivery" ? v.delivery : true));

  const closePanels = () => {
    setHub(null);
    setVehicle(null);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Mapa */}
      <div className="absolute inset-0 map-grid">
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_120%,transparent,oklch(0.13_0.005_285/0.85))]" />

        {/* Hubs */}
        {hubs.map((h) => (
          <button
            key={h.id}
            onClick={() => {
              setVehicle(null);
              setHub(h);
            }}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            aria-label={h.name}
          >
            <span className="relative flex items-center justify-center">
              <span
                className={`absolute size-12 rounded-2xl pulse-ring ${
                  mode === "buy" ? "bg-primary-glow/40" : "bg-primary/30"
                }`}
              />
              <span
                className={`relative flex size-11 items-center justify-center rounded-2xl border shadow-glow ${
                  mode === "buy"
                    ? "border-primary-glow bg-gradient-primary"
                    : "border-primary/60 bg-surface-elevated"
                }`}
              >
                <Home className="size-5 text-foreground" />
              </span>
            </span>
            <span className="mt-1 block whitespace-nowrap rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground/90">
              {h.name}
            </span>
          </button>
        ))}

        {/* Vehículos sueltos (solo modo alquiler) */}
        <AnimatePresence>
          {mode === "rent" &&
            visibleRentals.map((v) => {
              const Icon = kindIcon[v.kind];
              return (
                <motion.button
                  key={v.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  onClick={() => {
                    setHub(null);
                    setVehicle(v);
                  }}
                  style={{ left: `${v.x}%`, top: `${v.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  aria-label={`${kindLabel[v.kind]} ${v.id}`}
                >
                  <span className="flex size-9 items-center justify-center rounded-full border border-primary-glow/70 bg-background/90 backdrop-blur">
                    <Icon className="size-4 text-primary-glow" />
                  </span>
                </motion.button>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Controles superiores */}
      <div className="absolute inset-x-0 top-0 z-20 space-y-3 p-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <MobileNav />
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold tracking-tight">NODO Mobility</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {hubs.filter((h) => h.active).length} hubs activos cerca de ti
            </p>
          </div>
          <Link to="/admin" aria-label="Dashboard de telemetría">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full border border-border bg-surface-elevated/90 backdrop-blur"
            >
              <Settings className="size-5" />
            </Button>
          </Link>
        </div>

        {/* Segmented control Alquilar / Comprar */}
        <div className="rounded-full border border-border bg-surface-elevated/90 p-1 backdrop-blur">
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
                onClick={() => {
                  setMode(value);
                  closePanels();
                  setCatalogOpen(value === "buy");
                }}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                  mode === value ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-opciones de alquiler */}
        <AnimatePresence>
          {mode === "rent" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex gap-2"
            >
              {(
                [
                  ["hub", "En punto / estación", MapPin],
                  ["delivery", "A domicilio", Package],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => setSubmode(value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium backdrop-blur transition-colors ${
                    submode === value
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-border bg-surface/80 text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panel de Hub */}
      <AnimatePresence>
        {hub && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-border bg-surface p-5 shadow-panel"
          >
            <PanelHeader
              title={hub.name}
              subtitle={`${hub.zone} · ${hub.id}`}
              onClose={closePanels}
            />
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Capacidad actual</span>
                  <span>
                    {hub.occupied}/{hub.capacity} espacios
                  </span>
                </div>
                <Progress value={(hub.occupied / hub.capacity) * 100} className="mt-2" />
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BatteryCharging className="size-3.5 text-success" />
                  {hub.charging} vehículos en recarga
                </p>
              </div>

              <HubList
                title="Disponibles para alquiler"
                items={vehiclesForHub(hub.id, "rent")}
                action={(v) => (
                  <Button size="sm" onClick={() => setUnlocking(v)}>
                    Desbloquear
                  </Button>
                )}
              />
              <HubList
                title="Disponibles para compra"
                items={vehiclesForHub(hub.id, "sale")}
                action={(v) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toast.success(`Reserva creada para ${v.model}`)}
                  >
                    Reservar
                  </Button>
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom sheet de vehículo de alquiler */}
      <AnimatePresence>
        {vehicle && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-border bg-surface p-5 shadow-panel"
          >
            <PanelHeader
              title={`${kindLabel[vehicle.kind]} · ${vehicle.model}`}
              subtitle={vehicle.id}
              onClose={closePanels}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Batería" value={`${vehicle.battery}%`} accent={vehicle.battery < 25} />
              <Stat label="Tarifa" value={`${formatCOP(vehicle.pricePerMinute ?? 0)} / min`} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{vehicle.spec}</p>
            <Button className="mt-4 w-full" onClick={() => setUnlocking(vehicle)}>
              Desbloquear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Catálogo e-commerce (modo comprar) */}
      <AnimatePresence>
        {mode === "buy" && !hub && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: catalogOpen ? 0 : "calc(100% - 76px)" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="absolute inset-x-0 bottom-0 z-20 max-h-[72dvh] rounded-t-3xl border-t border-border bg-surface shadow-panel"
          >
            <button
              onClick={() => setCatalogOpen((o) => !o)}
              className="flex w-full items-center justify-between px-5 py-5"
            >
              <span className="text-sm font-semibold">Catálogo de venta</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {saleCatalog.length} vehículos
                <ChevronUp
                  className={`size-4 transition-transform ${catalogOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            <div className="max-h-[58dvh] space-y-3 overflow-y-auto px-5 pb-8">
              {saleCatalog.map((v) => {
                const Icon = kindIcon[v.kind];
                const hubName = hubs.find((h) => h.id === v.hubId)?.name;
                return (
                  <div
                    key={v.id}
                    className="rounded-2xl border border-border bg-surface-elevated p-4"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                        <Icon className="size-5 text-primary-glow" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{v.model}</p>
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
                      <Button
                        size="sm"
                        onClick={() =>
                          toast.success(`${v.model} reservado`, {
                            description: `Recoge en ${hubName}`,
                          })
                        }
                      >
                        Comprar / Reservar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {unlocking && <UnlockFlow vehicle={unlocking} onClose={() => setUnlocking(null)} />}
      </AnimatePresence>
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
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel">
        <X className="size-5" />
      </Button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title} ({items.length})
      </p>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin unidades en este punto.</p>
      )}
      {items.map((v) => {
        const Icon = kindIcon[v.kind];
        return (
          <div
            key={v.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3"
          >
            <Icon className="size-4 shrink-0 text-primary-glow" />
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
        );
      })}
    </div>
  );
}
