import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Navigation, Printer, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useHubs, useMe, useVehicles } from "@/lib/data/queries";
import type { Hub, Vehicle, VehicleKind, VehicleStatus } from "@/lib/data/types";
import { kindLabel } from "@/lib/format";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/admin_/qr")({
  head: () =>
    seo({
      title: "Hoja de QR de vehículos",
      description: "Hoja imprimible con el QR, el código y la ubicación de cada vehículo.",
      path: "/admin/qr",
      noindex: true,
    }),
  component: QrSheetPage,
});

const STATUS: Record<VehicleStatus, { label: string; cls: string }> = {
  available: { label: "Disponible", cls: "bg-success/15 text-success" },
  reserved: { label: "Reservado", cls: "bg-warning/20 text-warning" },
  in_use: { label: "En alquiler", cls: "bg-violet-500/15 text-violet-600" },
  maintenance: { label: "Mantenimiento", cls: "bg-muted text-muted-foreground" },
  offline: { label: "Fuera de línea", cls: "bg-muted text-muted-foreground" },
  sold: { label: "Vendido", cls: "bg-muted text-muted-foreground" },
};

const NO_HUB = "__sin_hub__";
const ALL = "all";

function QrSheetPage() {
  const meQ = useMe();
  const hubsQ = useHubs();
  const vehiclesQ = useVehicles();
  const [hubFilter, setHubFilter] = useState(ALL);
  const [kindFilter, setKindFilter] = useState(ALL);
  const [onlyRent, setOnlyRent] = useState(true);

  const hubs = useMemo(() => hubsQ.data ?? [], [hubsQ.data]);
  const groups = useMemo(() => {
    const list = (vehiclesQ.data ?? []).filter(
      (v) =>
        (!onlyRent || v.mode === "rent") &&
        (kindFilter === ALL || v.kind === kindFilter) &&
        (hubFilter === ALL || (v.hubId ?? NO_HUB) === hubFilter),
    );
    const byHub = new Map<string, Vehicle[]>();
    for (const v of list)
      byHub.set(v.hubId ?? NO_HUB, [...(byHub.get(v.hubId ?? NO_HUB) ?? []), v]);
    const order = [...hubs.map((h) => h.id), NO_HUB];
    return order
      .filter((id) => byHub.has(id))
      .map((id) => ({
        hub: hubs.find((h) => h.id === id) ?? null,
        vehicles: (byHub.get(id) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
      }));
  }, [vehiclesQ.data, hubs, onlyRent, kindFilter, hubFilter]);

  if (meQ.isPending || hubsQ.isPending || vehiclesQ.isPending)
    return (
      <Page>
        <LoadingState rows={3} label="Cargando vehículos…" testId="qr-loading" />
      </Page>
    );
  if (!meQ.data || meQ.data.role !== "operator")
    return (
      <Page>
        <div className="mx-auto max-w-md space-y-4 text-center" data-testid="qr-forbidden">
          <ShieldAlert className="mx-auto size-10 text-warning" aria-hidden />
          <h2 className="text-xl font-semibold">Acceso solo para operadores</h2>
          {!meQ.data && (
            <Link to="/login" search={{ redirect: "/admin/qr" }}>
              <Button>Ingresar</Button>
            </Link>
          )}
        </div>
      </Page>
    );
  if (hubsQ.isError || vehiclesQ.isError)
    return (
      <Page>
        <ErrorState message="No se pudo cargar la flota" />
      </Page>
    );

  return (
    <Page
      actions={
        <Button onClick={() => window.print()} data-testid="qr-print">
          <Printer className="size-4" aria-hidden /> Imprimir
        </Button>
      }
    >
      <style>{PRINT_CSS}</style>
      <div className="no-print flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Hub</Label>
          <Select value={hubFilter} onValueChange={setHubFilter}>
            <SelectTrigger className="w-52" data-testid="qr-filter-hub">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los hubs</SelectItem>
              {hubs.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
              <SelectItem value={NO_HUB}>Sin hub</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-52" data-testid="qr-filter-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {(Object.keys(kindLabel) as VehicleKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {kindLabel[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="qr-rent" checked={onlyRent} onCheckedChange={setOnlyRent} />
          <Label htmlFor="qr-rent">Solo alquiler</Label>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Sin vehículos con esos filtros" />
      ) : (
        groups.map(({ hub, vehicles }) => (
          <section key={hub?.id ?? NO_HUB} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {hub ? `${hub.name} · ${hub.zone}` : "Sin hub asignado (en la calle)"}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {vehicles.length} vehículo(s)
              </span>
            </h2>
            {hub && <HubWay hub={hub} />}
            <div className="qr-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => (
                <QrCard key={v.id} v={v} hub={hub} />
              ))}
            </div>
          </section>
        ))
      )}
    </Page>
  );
}

const mapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

function HubWay({ hub }: { hub: Hub }) {
  return (
    <p className="text-sm text-muted-foreground">
      <MapPin className="mr-1 inline size-4" aria-hidden />
      {hub.zone}, Bucaramanga ({hub.lat}, {hub.lng}) ·{" "}
      <a className="underline" href={mapsUrl(hub.lat, hub.lng)} target="_blank" rel="noreferrer">
        Cómo llegar
      </a>
    </p>
  );
}

function QrCard({ v, hub }: { v: Vehicle; hub: Hub | null }) {
  const st = STATUS[v.status ?? "available"];
  const [lat, lng] = hub ? [hub.lat, hub.lng] : [v.lat, v.lng];
  return (
    <figure
      className="qr-card m-0 space-y-2 rounded-xl border border-border bg-card p-4 text-center"
      data-testid={`qr-card-${v.id}`}
    >
      <img
        src={`/api/vehicles/${encodeURIComponent(v.id)}/qr.svg`}
        alt={`QR del vehículo ${v.id}`}
        width={220}
        height={220}
        loading="lazy"
        className="mx-auto size-56 bg-white"
      />
      <figcaption className="space-y-1">
        <div className="font-mono text-xl font-bold">{v.id}</div>
        <div className="text-xs text-muted-foreground">Código manual: UMH:{v.id}</div>
        <div className="text-sm font-medium">{v.model}</div>
        <div className="text-xs text-muted-foreground">
          {kindLabel[v.kind]} · {v.mode === "rent" ? "Alquiler" : "Venta"} · Batería {v.battery}%
        </div>
        <Badge className={`${st.cls} border-0`}>{st.label}</Badge>
        <div className="text-xs text-muted-foreground">
          {hub ? `${hub.name} (${hub.zone})` : "Sin hub: ubicación en calle"}
        </div>
        <a
          className="no-print inline-flex items-center gap-1 text-xs underline"
          href={mapsUrl(lat, lng)}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation className="size-3" aria-hidden /> Cómo llegar
        </a>
      </figcaption>
    </figure>
  );
}

function Page({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      <header className="no-print border-b border-border bg-background/90">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Button asChild size="icon" variant="secondary" className="rounded-full">
            <Link to="/admin" aria-label="Volver al panel">
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">Hoja de QR de vehículos</h1>
            <p className="truncate text-xs text-muted-foreground">
              Imprímela y pega cada QR en su vehículo, o escanéala desde el celular.
            </p>
          </div>
          {actions}
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  .qr-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 10px !important; }
  .qr-card { break-inside: avoid; border-color: #bbb !important; background: #fff !important; padding: 8px !important; }
  .qr-card img { width: 100% !important; height: auto !important; }
  section { break-inside: auto; }
  h2 { break-after: avoid; }
}`;
