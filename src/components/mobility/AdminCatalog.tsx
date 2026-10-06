import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDataSource } from "@/lib/data";
import { keys } from "@/lib/data/queries";
import type { Hub, Vehicle, VehicleKind, VehicleMode } from "@/lib/data/types";
import { formatCOP, kindLabel } from "@/lib/format";

// Gestión de catálogo y hubs por el operador (H7 / RF-21..22). RNF-08: agregar no exige cambios de modelo.

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function AdminCatalog({ vehicles, hubs }: { vehicles: Vehicle[]; hubs: Hub[] }) {
  const qc = useQueryClient();
  const ds = getDataSource();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.vehicles }),
      qc.invalidateQueries({ queryKey: keys.hubs }),
    ]);
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar");

  const [mode, setMode] = useState<VehicleMode>("sale");
  const addVehicle = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const hubId = get("hubId");
    const hub = hubs.find((h) => h.id === hubId);
    const base: Vehicle = {
      id: get("id").toUpperCase(),
      kind: get("kind") as VehicleKind,
      model: get("model"),
      mode,
      battery: Number(get("battery") || 100),
      spec: get("spec"),
      lat: hub?.lat ?? 7.1139,
      lng: hub?.lng ?? -73.1098,
      alert: "ok",
      ...(hubId ? { hubId } : {}),
      ...(mode === "sale"
        ? { price: Number(get("price")), condition: get("condition") as "nuevo" | "seminuevo" }
        : { pricePerMinute: Number(get("price")), delivery: f.get("delivery") === "on" }),
    };
    if (!base.id || !base.model || !(Number(get("price")) > 0)) {
      toast.error("Completa identificador, modelo y precio");
      return;
    }
    try {
      await ds.saveVehicle(base);
      await refresh();
      toast.success(`${base.model} guardado`);
      e.currentTarget.reset();
    } catch (err) {
      fail(err);
    }
  };

  const addHub = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const hub: Hub = {
      id: get("id").toUpperCase(),
      name: get("name"),
      zone: get("zone"),
      lat: Number(get("lat")),
      lng: Number(get("lng")),
      capacity: Number(get("capacity")),
      occupied: 0,
      charging: 0,
      active: true,
    };
    if (!hub.id || !hub.name || !hub.capacity || Number.isNaN(hub.lat) || Number.isNaN(hub.lng)) {
      toast.error("Completa todos los campos del hub");
      return;
    }
    try {
      await ds.saveHub(hub);
      await refresh();
      toast.success(`${hub.name} guardado`);
      e.currentTarget.reset();
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (kind: "vehicle" | "hub", id: string) => {
    try {
      if (kind === "vehicle") await ds.deleteVehicle(id);
      else await ds.deleteHub(id);
      await refresh();
      toast.success(`${id} eliminado`);
    } catch (err) {
      fail(err);
    }
  };

  return (
    <section
      aria-labelledby="cat-t"
      data-testid="admin-catalog"
      className="space-y-6 rounded-2xl border border-border bg-surface p-5"
    >
      <div>
        <h2
          id="cat-t"
          className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Gestión de catálogo y hubs
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agrega o elimina vehículos y hubs; el mapa y la tienda se actualizan sin cambios de
          código.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-semibold">Vehículos ({vehicles.length})</h3>
          <form onSubmit={addVehicle} className="grid grid-cols-2 gap-3" data-testid="vehicle-form">
            <Field id="v-id" label="Identificador" name="id" placeholder="SV-5010" required />
            <Field id="v-model" label="Modelo" name="model" required />
            <div className="space-y-1.5">
              <Label htmlFor="v-kind">Tipo</Label>
              <select id="v-kind" name="kind" className={selectClass}>
                {(Object.keys(kindLabel) as VehicleKind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-mode">Modo</Label>
              <select
                id="v-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as VehicleMode)}
                className={selectClass}
              >
                <option value="sale">Venta</option>
                <option value="rent">Alquiler</option>
              </select>
            </div>
            <Field
              id="v-price"
              label={mode === "sale" ? "Precio (COP)" : "Tarifa por minuto (COP)"}
              name="price"
              type="number"
              required
            />
            <Field
              id="v-battery"
              label="Batería (%)"
              name="battery"
              type="number"
              placeholder="100"
            />
            <div className="col-span-2">
              <Field id="v-spec" label="Especificación" name="spec" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-hub">Hub</Label>
              <select id="v-hub" name="hubId" className={selectClass}>
                <option value="">Sin hub</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            {mode === "sale" ? (
              <div className="space-y-1.5">
                <Label htmlFor="v-cond">Condición</Label>
                <select id="v-cond" name="condition" className={selectClass}>
                  <option value="nuevo">Nuevo</option>
                  <option value="seminuevo">Seminuevo</option>
                </select>
              </div>
            ) : (
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" name="delivery" className="accent-[var(--primary)]" /> Apto
                para domicilio
              </label>
            )}
            <Button type="submit" className="col-span-2" data-testid="vehicle-save">
              <Plus className="mr-2 size-4" aria-hidden />
              Guardar vehículo
            </Button>
          </form>
          <ul className="max-h-64 space-y-2 overflow-y-auto" data-testid="vehicle-admin-list">
            {vehicles.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  {v.id} · {v.model} ·{" "}
                  {v.mode === "sale"
                    ? formatCOP(v.price ?? 0)
                    : `${formatCOP(v.pricePerMinute ?? 0)}/min`}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Eliminar ${v.id}`}
                  onClick={() => void remove("vehicle", v.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Hubs ({hubs.length})</h3>
          <form onSubmit={addHub} className="grid grid-cols-2 gap-3" data-testid="hub-form">
            <Field id="h-id" label="Identificador" name="id" placeholder="HUB-05" required />
            <Field id="h-name" label="Nombre" name="name" required />
            <Field id="h-zone" label="Zona" name="zone" required />
            <Field id="h-cap" label="Capacidad" name="capacity" type="number" required />
            <Field
              id="h-lat"
              label="Latitud"
              name="lat"
              type="number"
              step="any"
              placeholder="7.1139"
              required
            />
            <Field
              id="h-lng"
              label="Longitud"
              name="lng"
              type="number"
              step="any"
              placeholder="-73.1098"
              required
            />
            <Button type="submit" className="col-span-2" data-testid="hub-save">
              <Plus className="mr-2 size-4" aria-hidden />
              Guardar hub
            </Button>
          </form>
          <ul className="space-y-2" data-testid="hub-admin-list">
            {hubs.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  {h.id} · {h.name} · {h.occupied}/{h.capacity}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Eliminar ${h.id}`}
                  onClick={() => void remove("hub", h.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  name,
  type = "text",
  required,
  ...rest
}: {
  id: string;
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} required={required} {...rest} />
    </div>
  );
}
