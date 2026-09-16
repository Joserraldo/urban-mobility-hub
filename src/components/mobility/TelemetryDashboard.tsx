import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  BatteryLow,
  Bike,
  Cpu,
  Gauge,
  MapPin,
  Plane,
  Radio,
  ShieldAlert,
  Siren,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  alertLabel,
  hubs,
  kindLabel,
  vehicles,
  type IotAlert,
  type Vehicle,
  type VehicleKind,
} from "@/lib/fleet-data";

const kindIcon: Record<VehicleKind, typeof Bike> = {
  scooter: Zap,
  bike: Bike,
  drone: Plane,
};

type AlertEvent = {
  id: string;
  vehicleId: string;
  type: Exclude<IotAlert, "ok">;
  at: string;
};

const simulations: { type: Exclude<IotAlert, "ok">; icon: typeof Siren; label: string }[] = [
  { type: "no-helmet", icon: ShieldAlert, label: "Sin casco" },
  { type: "crash", icon: Siren, label: "Caída / impacto" },
  { type: "gps-lost", icon: Radio, label: "Pérdida de GPS" },
  { type: "low-battery", icon: BatteryLow, label: "Batería crítica" },
];

export function TelemetryDashboard() {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [selected, setSelected] = useState<Vehicle>(vehicles[0]!);
  const [liveAlerts, setLiveAlerts] = useState<Record<string, IotAlert>>({});

  const alertOf = (v: Vehicle): IotAlert => liveAlerts[v.id] ?? v.alert;

  const simulate = (type: Exclude<IotAlert, "ok">) => {
    const target = vehicles.filter((v) => v.mode === "rent")[
      Math.floor(Math.random() * vehicles.filter((v) => v.mode === "rent").length)
    ]!;
    const event: AlertEvent = {
      id: `${target.id}-${Date.now()}`,
      vehicleId: target.id,
      type,
      at: new Date().toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
    setEvents((prev) => [event, ...prev].slice(0, 12));
    setLiveAlerts((prev) => ({ ...prev, [target.id]: type }));
    setSelected(target);
    toast.error(`ALERTA: ${alertLabel[type]}`, {
      description: `${kindLabel[target.kind]} ${target.id} · GPS ${target.gps}`,
    });
  };

  const fleetBattery = Math.round(
    vehicles.reduce((sum, v) => sum + v.battery, 0) / vehicles.length,
  );
  const activeAlerts = vehicles.filter((v) => alertOf(v) !== "ok").length;

  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
          <Link to="/" aria-label="Volver a la app">
            <Button size="icon" variant="secondary" className="rounded-full">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Panel de telemetría · Digital Twin
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Monitoreo IoT en vivo de la flota NODO
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Activity className="size-3.5 text-success" />
            En línea
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Vehículos conectados" value={`${vehicles.length}`} icon={Cpu} />
          <Kpi
            label="Hubs activos"
            value={`${hubs.filter((h) => h.active).length}`}
            icon={MapPin}
          />
          <Kpi label="Batería media" value={`${fleetBattery}%`} icon={Gauge} />
          <Kpi
            label="Alertas activas"
            value={`${activeAlerts}`}
            icon={ShieldAlert}
            danger={activeAlerts > 0}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Simulador de eventos IoT
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Dispara un evento para ver la reacción del gemelo digital y la alerta en pantalla.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {simulations.map((s) => (
              <Button
                key={s.type}
                variant="secondary"
                className="justify-start border border-border"
                onClick={() => simulate(s.type)}
              >
                <s.icon className="mr-2 size-4 text-destructive" />
                {s.label}
              </Button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Flota conectada
            </h2>
            {vehicles.map((v) => {
              const Icon = kindIcon[v.kind];
              const alert = alertOf(v);
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                    selected.id === v.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface-elevated hover:border-primary/50"
                  }`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                    <Icon className="size-5 text-primary-glow" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {v.model} · {v.id}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      GPS {v.gps} · {v.battery}% batería
                    </span>
                  </span>
                  <Badge
                    variant={alert === "ok" ? "secondary" : "destructive"}
                    className="shrink-0"
                  >
                    {alertLabel[alert]}
                  </Badge>
                </button>
              );
            })}
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Gemelo digital
              </h2>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.id + alertOf(selected)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 space-y-4"
                >
                  <div>
                    <p className="text-lg font-semibold">{selected.model}</p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabel[selected.kind]} · {selected.id} · {selected.spec}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Nivel de batería</span>
                      <span>{selected.battery}%</span>
                    </div>
                    <Progress value={selected.battery} className="mt-2" />
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <Field label="Coordenadas GPS" value={selected.gps} />
                    <Field
                      label="Punto asignado"
                      value={hubs.find((h) => h.id === selected.hubId)?.name ?? "En calle"}
                    />
                    <Field label="Modo" value={selected.mode === "rent" ? "Alquiler" : "Venta"} />
                    <Field label="Estado IoT" value={alertLabel[alertOf(selected)]} />
                  </dl>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Registro de alertas
              </h2>
              {events.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Sin eventos registrados en esta sesión.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  <AnimatePresence initial={false}>
                    {events.map((e) => (
                      <motion.li
                        key={e.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {alertLabel[e.type]} · {e.vehicleId}
                        </span>
                        <span className="shrink-0 text-muted-foreground">{e.at}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  danger,
}: {
  label: string;
  value: string;
  icon: typeof Cpu;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <Icon className={`size-4 ${danger ? "text-destructive" : "text-primary-glow"}`} />
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium">{value}</dd>
    </div>
  );
}
