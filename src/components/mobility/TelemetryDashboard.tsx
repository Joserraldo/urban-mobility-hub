import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CircleHelp,
  ArrowLeft,
  BatteryLow,
  Cpu,
  Gauge,
  MapPin,
  Radio,
  RotateCcw,
  ShieldAlert,
  Siren,
  Wrench,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { AdminCatalog } from "@/components/mobility/AdminCatalog";
import { MaintenancePanel } from "@/components/mobility/MaintenancePanel";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { GuidedTour, type TourStep } from "@/components/common/GuidedTour";
import { SoundToggle } from "@/components/common/SoundToggle";
import { playSound } from "@/lib/sound";
import { batteryLevel } from "@/lib/geo";
import { VehicleIcon } from "@/components/common/vehicle-icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDataSource } from "@/lib/data";
import {
  keys,
  useAlerts,
  useFleetLive,
  useHubs,
  useMaintenanceActions,
  useMe,
  useTriggerAlert,
  useVehicleTelemetry,
  useVehicles,
} from "@/lib/data/queries";
import type { ActiveAlertType, AlertEvent, Vehicle } from "@/lib/data/types";
import { alertLabel, formatCoords, formatTime, kindLabel } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

const FleetMap = lazy(() => import("@/components/mobility/FleetMap"));
const ALL_LAYERS = { vehicles: true, hubs: true, sale: false, coverage: false };

const simulations: { type: ActiveAlertType; icon: typeof Siren; label: string; testId: string }[] =
  [
    { type: "no-helmet", icon: ShieldAlert, label: "Sin casco", testId: "sim-no-helmet" },
    { type: "crash", icon: Siren, label: "Caída / impacto", testId: "sim-crash" },
    { type: "gps-lost", icon: Radio, label: "Pérdida de GPS", testId: "sim-gps-lost" },
    { type: "low-battery", icon: BatteryLow, label: "Batería crítica", testId: "sim-low-battery" },
  ];

const ADMIN_TOUR: TourStep[] = [
  {
    title: "Así se usa el panel del operador",
    body: "Cinco pasos: indicadores, simulador, flota, historial y catálogo. Puedes saltarlo y repetirlo con el botón de ayuda arriba.",
  },
  {
    target: '[data-tour="kpis"]',
    title: "El estado de la flota de un vistazo",
    body: "Se actualizan solos. Si hay alertas activas, el indicador se pone en rojo hasta que las atiendas.",
  },
  {
    target: '[data-tour="simulator"]',
    title: "Prueba una alerta",
    body: "Elige un vehículo y dispara un evento: sin casco, caída, pérdida de GPS o batería crítica. Llega como aviso y queda en el historial. Restablecer lo devuelve a la normalidad.",
  },
  {
    target: '[data-tour="fleet"]',
    title: "Flota conectada",
    body: "Los vehículos con alerta suben arriba. Toca uno para ver su gemelo digital: batería, posición y estado.",
  },
  {
    target: '[data-tour="log"]',
    title: "Historial de alertas",
    body: "Cada alerta queda guardada y nunca se borra. El número en milisegundos es cuánto tardó en llegar.",
  },
  {
    title: "Mantenimiento, catálogo y entregas",
    body: "En las otras pestañas: envía vehículos a mantenimiento y ciérralos, crea o edita vehículos y hubs, y gestiona las entregas. El mapa y la tienda se actualizan al instante.",
  },
];

export type ExtraTab = { value: string; label: string; content: React.ReactNode };

/** `extraTabs` permite sumar pestañas al panel (Entregas, Cámara PC…) desde `routes/admin.tsx`. */
export function TelemetryDashboard({ extraTabs = [] }: { extraTabs?: ExtraTab[] }) {
  const meQ = useMe();
  const live = useFleetLive();
  const hubsQ = useHubs();
  const vehiclesQ = useVehicles();
  const alertsQ = useAlerts();
  const trigger = useTriggerAlert();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const [targetId, setTargetId] = useState<string>("");
  const [latency, setLatency] = useState<number | null>(null);
  const [tourSignal, setTourSignal] = useState(0);
  // Alertas recién llegadas: se resaltan un momento en el historial.
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const hubs = hubsQ.data ?? [];
  const vehicles = useMemo(() => vehiclesQ.data ?? [], [vehiclesQ.data]);
  const alerts = alertsQ.data ?? [];
  const rentals = vehicles.filter((v) => v.mode === "rent");
  const selected = vehicles.find((v) => v.id === (selectedId ?? vehicles[0]?.id)) ?? null;
  const target = targetId || rentals[0]?.id || "";

  // Notificación inmediata al operador por cada alerta (RF-12a, RNF-02)
  useEffect(() => {
    const unsub = getDataSource().subscribeFleet((e) => {
      if (e.type !== "alert") return;
      const a: AlertEvent = e.alert;
      setLatency(Math.max(0, Date.now() - a.ts));
      playSound("alert");
      setFresh((f) => new Set(f).add(a.id));
      window.setTimeout(
        () =>
          setFresh((f) => {
            const n = new Set(f);
            n.delete(a.id);
            return n;
          }),
        2500,
      );
      toast.custom(
        () => (
          <div
            role="alert"
            data-testid="alert-toast"
            className="w-[320px] rounded-xl border border-destructive/60 bg-surface p-4 text-sm shadow-lg"
          >
            <p className="font-semibold text-destructive">ALERTA: {alertLabel[a.type]}</p>
            <p className="text-muted-foreground">
              Vehículo {a.vehicleId} · GPS {formatCoords(a.lat, a.lng)}
            </p>
          </div>
        ),
        { duration: 6000 },
      );
    });
    return unsub;
  }, []);

  if (meQ.isPending)
    return (
      <Shell>
        <LoadingState rows={3} label="Verificando sesión…" testId="admin-loading" />
      </Shell>
    );
  if (!meQ.data || meQ.data.role !== "operator") {
    return (
      <Shell>
        <div className="mx-auto max-w-md space-y-4 text-center" data-testid="admin-forbidden">
          <ShieldAlert className="mx-auto size-10 text-warning" aria-hidden />
          <h2 className="text-xl font-semibold">Acceso solo para operadores</h2>
          <p className="text-sm text-muted-foreground">
            {meQ.data
              ? "Tu cuenta no tiene rol de operador."
              : "Ingresa con una cuenta de operador para ver el panel de telemetría."}
          </p>
          {!meQ.data && (
            <Link to="/login" search={{ redirect: "/admin" }}>
              <Button>Ingresar</Button>
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  const loading = hubsQ.isPending || vehiclesQ.isPending;
  const error = hubsQ.isError || vehiclesQ.isError;
  const fleetBattery = vehicles.length
    ? Math.round(vehicles.reduce((s, v) => s + v.battery, 0) / vehicles.length)
    : 0;
  const activeAlerts = vehicles.filter((v) => v.alert !== "ok").length;
  const inMaintenance = vehicles.filter((v) => v.status === "maintenance").length;
  // Los vehículos con alerta van primero; el resto conserva su orden.
  const fleetSorted = [...vehicles].sort(
    (a, b) => Number(b.alert !== "ok") - Number(a.alert !== "ok"),
  );

  const simulate = (type: ActiveAlertType) => {
    if (!target) return;
    const t0 = performance.now();
    trigger.mutate(
      { vehicleId: target, type },
      {
        onSuccess: () => {
          setSelectedId(target);
          setLatency((l) => l ?? Math.round(performance.now() - t0));
        },
        onError: (e) => {
          playSound("error");
          toast.error(e.message);
        },
      },
    );
  };

  const reset = async (vehicleId: string) => {
    try {
      await getDataSource().clearAlert(vehicleId);
      await qc.invalidateQueries({ queryKey: keys.vehicles });
      toast.success("Estado del vehículo restablecido");
      playSound("step");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo restablecer el vehículo");
    }
  };

  return (
    <Shell live={live} onHelp={() => setTourSignal((n) => n + 1)}>
      {loading && <LoadingState rows={4} label="Cargando telemetría…" testId="admin-loading" />}
      {error && (
        <ErrorState
          testId="admin-error"
          message="No pudimos cargar la telemetría de la flota."
          onRetry={() => {
            void hubsQ.refetch();
            void vehiclesQ.refetch();
          }}
        />
      )}
      {!loading && !error && (
        <>
          <section
            aria-label="Indicadores de flota"
            className="grid grid-cols-2 gap-3 lg:grid-cols-5"
            data-tour="kpis"
          >
            <Kpi
              testId="kpi-connected"
              label="Vehículos conectados"
              value={vehicles.length}
              icon={Cpu}
            />
            <Kpi
              testId="kpi-hubs"
              label="Hubs activos"
              value={hubs.filter((h) => h.active).length}
              icon={MapPin}
            />
            <Kpi
              testId="kpi-battery"
              label="Batería media"
              value={fleetBattery}
              suffix="%"
              icon={Gauge}
            />
            <Kpi
              testId="kpi-alerts"
              label="Alertas activas"
              value={activeAlerts}
              icon={ShieldAlert}
              danger={activeAlerts > 0}
            />
            <Kpi
              testId="kpi-maintenance"
              label="En mantenimiento"
              value={inMaintenance}
              icon={Wrench}
            />
          </section>

          <Tabs defaultValue="monitoreo" className="space-y-6">
            <TabsList className="h-auto flex-wrap" data-testid="admin-tabs">
              <TabsTrigger value="monitoreo">Monitoreo</TabsTrigger>
              <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
              <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
              {extraTabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="monitoreo" className="mt-0 space-y-6">
              <section
                aria-labelledby="sim-t"
                className="rounded-2xl border border-border bg-surface p-5"
                data-tour="simulator"
              >
                <h2 id="sim-t" className="text-base font-semibold tracking-tight">
                  Simulador de eventos IoT
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Elige un vehículo de alquiler y dispara un evento para ver la reacción del gemelo
                  digital.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="sim-vehicle" className="text-xs text-muted-foreground">
                      Vehículo objetivo
                    </Label>
                    <Select value={target} onValueChange={setTargetId}>
                      <SelectTrigger
                        id="sim-vehicle"
                        data-testid="sim-vehicle-select"
                        className="h-10 w-full"
                      >
                        <SelectValue placeholder="Elige un vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {rentals.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.id} · {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    className="self-end"
                    disabled={!target}
                    onClick={() => void reset(target)}
                    data-testid="sim-reset"
                  >
                    <RotateCcw className="mr-2 size-4" aria-hidden />
                    Restablecer
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {simulations.map((s) => (
                    <Button
                      key={s.type}
                      variant="secondary"
                      className="justify-start border border-border"
                      disabled={!target || trigger.isPending}
                      onClick={() => simulate(s.type)}
                      data-testid={s.testId}
                    >
                      <s.icon className="mr-2 size-4 text-destructive" aria-hidden />
                      {s.label}
                    </Button>
                  ))}
                </div>
              </section>

              <section aria-labelledby="map-t" className="space-y-3" data-testid="admin-fleet-map">
                <h2 id="map-t" className="text-base font-semibold tracking-tight">
                  Mapa de flota en vivo
                </h2>
                <div className="relative h-[340px] overflow-hidden rounded-2xl border border-border">
                  {isClient && (
                    <Suspense fallback={<div className="absolute inset-0 map-grid" aria-hidden />}>
                      <FleetMap
                        vehicles={vehicles}
                        hubs={hubs}
                        layers={ALL_LAYERS}
                        selectedVehicleId={selected?.id}
                        onSelectHub={() => undefined}
                        onSelectVehicle={setSelectedId}
                      />
                    </Suspense>
                  )}
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <MapKey color="var(--success)">Disponible (batería alta)</MapKey>
                  <MapKey color="var(--warning)">Batería media</MapKey>
                  <MapKey color="var(--destructive)">Batería baja o alerta</MapKey>
                  <MapKey color="oklch(0.68 0.2 305)">En alquiler (violeta)</MapKey>
                  <MapKey color="oklch(0.72 0.17 55)">En mantenimiento (gris/naranja)</MapKey>
                </ul>
              </section>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <section aria-labelledby="fleet-t" className="space-y-3" data-tour="fleet">
                  <h2 id="fleet-t" className="text-base font-semibold tracking-tight">
                    Flota conectada
                  </h2>
                  {vehicles.length === 0 && <EmptyState title="No hay vehículos registrados" />}
                  <ul className="space-y-3">
                    {fleetSorted.map((v) => (
                      <motion.li
                        key={v.id}
                        layout="position"
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(v.id)}
                          aria-pressed={selected?.id === v.id}
                          data-testid={`fleet-row-${v.id}`}
                          className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-4 text-left transition-colors duration-200 ${
                            selected?.id === v.id
                              ? "border-primary bg-primary/10"
                              : v.alert !== "ok"
                                ? "border-destructive/50 bg-destructive/10 hover:border-destructive"
                                : "border-border bg-surface-elevated hover:border-primary/50"
                          }`}
                        >
                          <span
                            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                              v.alert !== "ok" ? "bg-destructive/20" : "bg-primary/20"
                            }`}
                          >
                            <VehicleIcon
                              kind={v.kind}
                              className={`size-5 ${v.alert !== "ok" ? "text-destructive" : "text-primary-glow"}`}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {v.model} · {v.id}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              GPS {formatCoords(v.lat, v.lng)} ·{" "}
                              {v.mode === "rent" ? "Alquiler" : "Venta"}
                            </span>
                            <span className="mt-1.5 flex items-center gap-2">
                              <span
                                className="h-1 w-24 overflow-hidden rounded-full bg-border"
                                aria-hidden
                              >
                                <span
                                  className={`block h-full rounded-full transition-[width] duration-500 ${
                                    batteryLevel(v.battery) === "high"
                                      ? "bg-success"
                                      : batteryLevel(v.battery) === "mid"
                                        ? "bg-warning"
                                        : "bg-destructive"
                                  }`}
                                  style={{ width: `${v.battery}%` }}
                                />
                              </span>
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {v.battery}% batería
                              </span>
                            </span>
                          </span>
                          <Badge
                            variant={v.alert === "ok" ? "secondary" : "destructive"}
                            className="shrink-0"
                            data-testid={`fleet-alert-${v.id}`}
                          >
                            {alertLabel[v.alert]}
                          </Badge>
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                </section>

                <div className="space-y-6">
                  <section
                    aria-labelledby="twin-t"
                    data-testid="twin-detail"
                    className="rounded-2xl border border-border bg-surface p-5"
                  >
                    <h2 id="twin-t" className="text-base font-semibold tracking-tight">
                      Gemelo digital
                    </h2>
                    {selected ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selected.id + selected.alert}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-3 space-y-4"
                        >
                          <div>
                            <p className="text-lg font-semibold" data-testid="twin-model">
                              {selected.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {kindLabel[selected.kind]} · {selected.id} · {selected.spec}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Nivel de batería</span>
                              <span>{selected.battery}%</span>
                            </div>
                            <Progress
                              value={selected.battery}
                              className="mt-2"
                              aria-label="Nivel de batería"
                            />
                          </div>
                          <dl className="grid grid-cols-2 gap-3 text-xs">
                            <Field
                              label="Coordenadas GPS"
                              value={formatCoords(selected.lat, selected.lng)}
                              testId="twin-gps"
                            />
                            <Field
                              label="Hub asignado"
                              value={hubs.find((h) => h.id === selected.hubId)?.name ?? "En calle"}
                            />
                            <Field
                              label="Modo"
                              value={selected.mode === "rent" ? "Alquiler" : "Venta"}
                            />
                            <Field
                              label="Estado del vehículo"
                              value={statusLabel[selected.status ?? "available"]}
                              testId="twin-status"
                            />
                            {selected.status === "in_use" && (
                              <Field
                                label="Velocidad en vivo"
                                value={
                                  selected.speedKmh !== undefined
                                    ? `${Math.round(selected.speedKmh)} km/h`
                                    : "Esperando datos…"
                                }
                                testId="twin-speed"
                              />
                            )}
                            <Field
                              label="Estado IoT"
                              value={alertLabel[selected.alert]}
                              testId="twin-alert"
                            />
                          </dl>
                          <TwinTelemetry vehicleId={selected.id} />
                          <TwinMaintenance vehicle={selected} />
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">Selecciona un vehículo.</p>
                    )}
                  </section>

                  <section
                    aria-labelledby="log-t"
                    className="rounded-2xl border border-border bg-surface p-5"
                    data-tour="log"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 id="log-t" className="text-base font-semibold tracking-tight">
                        Registro de alertas
                      </h2>
                      {latency !== null && (
                        <Badge
                          variant="secondary"
                          data-testid="alert-latency"
                          title="Tiempo desde que se dispara hasta que se refleja (RNF-02: < 1 s)"
                        >
                          {latency} ms
                        </Badge>
                      )}
                    </div>
                    <div data-testid="alert-log" aria-live="polite">
                      {alertsQ.isPending ? (
                        <LoadingState rows={1} />
                      ) : alertsQ.isError ? (
                        <ErrorState
                          message="No pudimos cargar el registro."
                          onRetry={() => void alertsQ.refetch()}
                        />
                      ) : alerts.length === 0 ? (
                        <p
                          className="mt-3 text-xs text-muted-foreground"
                          data-testid="alert-log-empty"
                        >
                          Aún no hay alertas. Dispara una desde el simulador para ver cómo llega.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          <AnimatePresence initial={false}>
                            {alerts.slice(0, 20).map((e) => (
                              <motion.li
                                key={e.id}
                                layout="position"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                data-testid="alert-log-row"
                                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs transition-colors duration-700 ${
                                  fresh.has(e.id)
                                    ? "border-destructive bg-destructive/30"
                                    : "border-destructive/40 bg-destructive/10"
                                }`}
                              >
                                <span className="min-w-0 truncate font-medium">
                                  {alertLabel[e.type]} · {e.vehicleId} ·{" "}
                                  {formatCoords(e.lat, e.lng)}
                                </span>
                                <time
                                  dateTime={new Date(e.ts).toISOString()}
                                  className="shrink-0 text-muted-foreground"
                                >
                                  {formatTime(e.ts)}
                                </time>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="mantenimiento" className="mt-0">
              <MaintenancePanel vehicles={vehicles} />
            </TabsContent>
            <TabsContent value="catalogo" className="mt-0">
              <AdminCatalog vehicles={vehicles} hubs={hubs} />
            </TabsContent>
            {extraTabs.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-0">
                {t.content}
              </TabsContent>
            ))}
          </Tabs>
          <GuidedTour storageKey="umh-tour-admin-v1" steps={ADMIN_TOUR} openSignal={tourSignal} />
        </>
      )}
    </Shell>
  );
}

const statusLabel: Record<NonNullable<Vehicle["status"]>, string> = {
  available: "Disponible",
  reserved: "Reservado",
  in_use: "En uso",
  sold: "Vendido",
  offline: "Fuera de servicio",
  maintenance: "En mantenimiento",
};

const SPARK_W = 220;
const SPARK_H = 44;

/** Línea mínima (SVG puro) para una serie; sin dependencias ni ejes: el valor último va en el rótulo. */
function Spark({ values, max, className }: { values: number[]; max: number; className: string }) {
  if (values.length < 2) return null;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_W;
      const y = SPARK_H - (Math.min(Math.max(v, 0), max) / max) * SPARK_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className={`h-11 w-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Batería y velocidad de la última hora (historial `telemetry_log`). */
function TwinTelemetry({ vehicleId }: { vehicleId: string }) {
  const q = useVehicleTelemetry(vehicleId, 60);
  const samples = q.data ?? [];
  const last = samples[samples.length - 1];
  return (
    <div data-testid="twin-telemetry" className="space-y-2">
      <p className="text-[10px] text-muted-foreground">Última hora</p>
      {q.isPending ? (
        <p className="text-xs text-muted-foreground">Cargando historial…</p>
      ) : samples.length < 2 ? (
        <p className="text-xs text-muted-foreground">
          Sin lecturas recientes. El historial se llena cuando el vehículo reporta telemetría.
        </p>
      ) : (
        <>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Batería</span>
              <span>{Math.round(last?.battery ?? 0)}%</span>
            </div>
            <Spark values={samples.map((s) => s.battery)} max={100} className="text-success" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Velocidad</span>
              <span>{Math.round(last?.speedKmh ?? 0)} km/h</span>
            </div>
            <Spark
              values={samples.map((s) => s.speedKmh)}
              max={Math.max(30, ...samples.map((s) => s.speedKmh))}
              className="text-primary-glow"
            />
          </div>
        </>
      )}
    </div>
  );
}

/** Acceso rápido a mantenimiento desde el gemelo; se sugiere con alerta de caída o batería crítica. */
function TwinMaintenance({ vehicle }: { vehicle: Vehicle }) {
  const { send } = useMaintenanceActions();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const suggested = vehicle.alert === "crash" || vehicle.alert === "low-battery";
  if (vehicle.status === "maintenance")
    return (
      <p className="text-xs text-warning" data-testid="twin-in-maintenance">
        En mantenimiento: ciérralo desde la pestaña Mantenimiento.
      </p>
    );
  if (vehicle.status === "sold" || vehicle.status === "in_use")
    return (
      <p className="text-xs text-muted-foreground">
        {vehicle.status === "in_use"
          ? "En viaje: no se puede enviar a mantenimiento."
          : "Vendido: no admite mantenimiento."}
      </p>
    );
  const confirm = () => {
    const r = reason.trim() || alertLabel[vehicle.alert];
    send.mutate(
      { vehicleId: vehicle.id, reason: r },
      {
        onSuccess: () => {
          toast.success(`${vehicle.id} en mantenimiento`);
          setOpen(false);
          setReason("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };
  return (
    <div className="space-y-2">
      {!open ? (
        <Button
          variant={suggested ? "destructive" : "secondary"}
          size="sm"
          onClick={() => {
            setReason(suggested ? alertLabel[vehicle.alert] : "");
            setOpen(true);
          }}
          data-testid="twin-maintenance"
        >
          <Wrench className="mr-2 size-4" aria-hidden />
          Enviar a mantenimiento
          {suggested ? " (sugerido)" : ""}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            aria-label="Motivo del mantenimiento"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo"
            className="min-w-0 flex-1"
          />
          <Button
            size="sm"
            onClick={confirm}
            disabled={send.isPending}
            data-testid="twin-maintenance-confirm"
          >
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

function Shell({
  children,
  live,
  onHelp,
}: {
  children: React.ReactNode;
  live?: boolean;
  onHelp?: () => void;
}) {
  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-4 py-4">
          <Button asChild size="icon" variant="secondary" className="rounded-full">
            <Link to="/app" aria-label="Volver a la app" data-testid="admin-back">
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">Panel del operador</h1>
            <p className="truncate text-xs text-muted-foreground">
              Estado en vivo de la flota, alertas y catálogo
            </p>
          </div>
          <SoundToggle className="rounded-full" />
          {onHelp ? (
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={onHelp}
              aria-label="Ver tutorial del panel"
              data-testid="admin-tour-open"
            >
              <CircleHelp className="size-5" aria-hidden />
            </Button>
          ) : (
            <span />
          )}
          <Badge variant="secondary" className="gap-1.5" data-testid="admin-live">
            <Activity
              className={`size-3.5 ${live ? "text-success" : "text-muted-foreground"}`}
              aria-hidden
            />
            {live ? "En línea" : "Conectando…"}
          </Badge>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  icon: Icon,
  danger,
  testId,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof Cpu;
  danger?: boolean;
  testId: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors duration-300 ${
        danger ? "border-destructive/60 bg-destructive/10" : "border-border bg-surface-elevated"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon
          className={`size-4 ${danger ? "text-destructive" : "text-primary-glow"}`}
          aria-hidden
        />
        {danger && (
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
        )}
      </span>
      <p className={`mt-3 text-2xl font-bold tracking-tight ${danger ? "text-destructive" : ""}`}>
        <AnimatedNumber value={value} suffix={suffix ?? ""} testId={testId} />
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

function MapKey({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className="size-3 rounded-full border-[3px]"
        style={{ borderColor: color }}
        aria-hidden
      />
      {children}
    </li>
  );
}
