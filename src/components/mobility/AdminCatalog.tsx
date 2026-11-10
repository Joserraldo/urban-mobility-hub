import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDataSource } from "@/lib/data";
import { keys } from "@/lib/data/queries";
import type { Hub, Vehicle, VehicleKind, VehicleMode } from "@/lib/data/types";
import { formatCOP, kindLabel } from "@/lib/format";

type VehicleStatusChoice = "available" | "reserved" | "in_use" | "offline";
const STATUS_CHOICES: Record<VehicleStatusChoice, string> = {
  available: "Disponible",
  reserved: "Reservado",
  in_use: "En uso",
  offline: "Fuera de servicio",
};

// Gestión de catálogo y hubs por el operador (UC13 / RF-23, RF-24): crear, editar y retirar.
// RNF-08: agregar no exige cambios de modelo.

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
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [editHub, setEditHub] = useState<Hub | null>(null);

  const startEditVehicle = (v: Vehicle) => {
    setEditVehicle(v);
    setMode(v.mode);
  };
  const cancelEditVehicle = () => {
    setEditVehicle(null);
    setMode("sale");
  };

  const addVehicle = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const hubId = get("hubId");
    const hub = hubs.find((h) => h.id === hubId);
    const base: Vehicle = {
      ...(editVehicle ?? {}),
      id: editVehicle?.id ?? get("id").toUpperCase(),
      kind: get("kind") as VehicleKind,
      model: get("model"),
      mode,
      battery: Number(get("battery") || 100),
      spec: get("spec"),
      lat: editVehicle?.lat ?? hub?.lat ?? 7.1139,
      lng: editVehicle?.lng ?? hub?.lng ?? -73.1098,
      alert: editVehicle?.alert ?? "ok",
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
      toast.success(editVehicle ? `${base.model} actualizado` : `${base.model} guardado`);
      form.reset();
      cancelEditVehicle();
    } catch (err) {
      fail(err);
    }
  };

  const addHub = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const hub: Hub = {
      id: editHub?.id ?? get("id").toUpperCase(),
      name: get("name"),
      zone: get("zone"),
      lat: Number(get("lat")),
      lng: Number(get("lng")),
      capacity: Number(get("capacity")),
      occupied: editHub?.occupied ?? 0,
      charging: editHub?.charging ?? 0,
      active: editHub?.active ?? true,
    };
    if (!hub.id || !hub.name || !hub.capacity || Number.isNaN(hub.lat) || Number.isNaN(hub.lng)) {
      toast.error("Completa todos los campos del hub");
      return;
    }
    try {
      await ds.saveHub(hub);
      await refresh();
      toast.success(editHub ? `${hub.name} actualizado` : `${hub.name} guardado`);
      form.reset();
      setEditHub(null);
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (id: string) => {
    try {
      await ds.deleteHub(id);
      await refresh();
      toast.success(`${id} eliminado`);
    } catch (err) {
      fail(err);
    }
  };

  // Los vehículos no se borran: el operador cambia su estado de uso (liberar cancela sus reservas abiertas).
  const changeStatus = async (id: string, status: VehicleStatusChoice) => {
    try {
      const { cancelled } = await ds.setVehicleStatus(id, status);
      await refresh();
      toast.success(
        cancelled > 0
          ? `${id}: estado cambiado. Se cancelaron ${cancelled} reserva(s) abierta(s)`
          : `${id}: estado cambiado`,
      );
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
        <h2 id="cat-t" className="text-base font-semibold tracking-tight">
          Gestión de catálogo y hubs
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agrega, edita o retira vehículos y hubs; el mapa y la tienda se actualizan sin cambios de
          código.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-semibold">Vehículos ({vehicles.length})</h3>
          <form
            key={editVehicle?.id ?? "nuevo"}
            onSubmit={addVehicle}
            className="grid grid-cols-2 gap-3"
            data-testid="vehicle-form"
          >
            {editVehicle && (
              <p className="col-span-2 rounded-md bg-muted px-3 py-2 text-xs" role="status">
                Editando <strong>{editVehicle.id}</strong>. El identificador no cambia.
              </p>
            )}
            <Field
              id="v-id"
              label="Identificador"
              name="id"
              placeholder="SV-5010"
              required
              defaultValue={editVehicle?.id}
              readOnly={Boolean(editVehicle)}
            />
            <Field
              id="v-model"
              label="Modelo"
              name="model"
              required
              defaultValue={editVehicle?.model}
            />
            <div className="space-y-1.5">
              <Label htmlFor="v-kind">Tipo</Label>
              <select
                id="v-kind"
                name="kind"
                className={selectClass}
                defaultValue={editVehicle?.kind}
              >
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
              defaultValue={
                editVehicle
                  ? String(
                      (editVehicle.mode === "sale"
                        ? editVehicle.price
                        : editVehicle.pricePerMinute) ?? "",
                    )
                  : undefined
              }
            />
            <Field
              id="v-battery"
              label="Batería (%)"
              name="battery"
              type="number"
              placeholder="100"
              defaultValue={editVehicle ? String(editVehicle.battery) : undefined}
            />
            <div className="col-span-2">
              <Field
                id="v-spec"
                label="Especificación"
                name="spec"
                required
                defaultValue={editVehicle?.spec}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-hub">Hub</Label>
              <select
                id="v-hub"
                name="hubId"
                className={selectClass}
                defaultValue={editVehicle?.hubId ?? ""}
              >
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
                <select
                  id="v-cond"
                  name="condition"
                  className={selectClass}
                  defaultValue={editVehicle?.condition ?? "nuevo"}
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="seminuevo">Seminuevo</option>
                </select>
              </div>
            ) : (
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  name="delivery"
                  className="accent-[var(--primary)]"
                  defaultChecked={Boolean(editVehicle?.delivery)}
                />{" "}
                Apto para domicilio
              </label>
            )}
            <Button
              type="submit"
              className={editVehicle ? "" : "col-span-2"}
              data-testid="vehicle-save"
            >
              {editVehicle ? (
                <Pencil className="mr-2 size-4" aria-hidden />
              ) : (
                <Plus className="mr-2 size-4" aria-hidden />
              )}
              {editVehicle ? "Actualizar vehículo" : "Guardar vehículo"}
            </Button>
            {editVehicle && (
              <Button type="button" variant="outline" onClick={cancelEditVehicle}>
                <X className="mr-2 size-4" aria-hidden />
                Cancelar
              </Button>
            )}
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
                <span className="flex shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Editar ${v.id}`}
                    onClick={() => startEditVehicle(v)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {v.status !== "sold" && (
                    <select
                      aria-label={`Estado de ${v.id}`}
                      data-testid={`vehicle-status-${v.id}`}
                      className="ml-1 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
                      value={v.status ?? "available"}
                      onChange={(e) =>
                        void changeStatus(v.id, e.target.value as VehicleStatusChoice)
                      }
                    >
                      {Object.entries(STATUS_CHOICES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Hubs ({hubs.length})</h3>
          <form
            key={editHub?.id ?? "nuevo"}
            onSubmit={addHub}
            className="grid grid-cols-2 gap-3"
            data-testid="hub-form"
          >
            {editHub && (
              <p className="col-span-2 rounded-md bg-muted px-3 py-2 text-xs" role="status">
                Editando <strong>{editHub.id}</strong>. El identificador no cambia.
              </p>
            )}
            <Field
              id="h-id"
              label="Identificador"
              name="id"
              placeholder="HUB-05"
              required
              defaultValue={editHub?.id}
              readOnly={Boolean(editHub)}
            />
            <Field id="h-name" label="Nombre" name="name" required defaultValue={editHub?.name} />
            <Field id="h-zone" label="Zona" name="zone" required defaultValue={editHub?.zone} />
            <Field
              id="h-cap"
              label="Capacidad"
              name="capacity"
              type="number"
              required
              defaultValue={editHub ? String(editHub.capacity) : undefined}
            />
            <Field
              id="h-lat"
              label="Latitud"
              name="lat"
              type="number"
              step="any"
              placeholder="7.1139"
              required
              defaultValue={editHub ? String(editHub.lat) : undefined}
            />
            <Field
              id="h-lng"
              label="Longitud"
              name="lng"
              type="number"
              step="any"
              placeholder="-73.1098"
              required
              defaultValue={editHub ? String(editHub.lng) : undefined}
            />
            <Button type="submit" className={editHub ? "" : "col-span-2"} data-testid="hub-save">
              {editHub ? (
                <Pencil className="mr-2 size-4" aria-hidden />
              ) : (
                <Plus className="mr-2 size-4" aria-hidden />
              )}
              {editHub ? "Actualizar hub" : "Guardar hub"}
            </Button>
            {editHub && (
              <Button type="button" variant="outline" onClick={() => setEditHub(null)}>
                <X className="mr-2 size-4" aria-hidden />
                Cancelar
              </Button>
            )}
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
                <span className="flex shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Editar ${h.id}`}
                    onClick={() => setEditHub(h)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Eliminar ${h.id}`}
                    onClick={() => void remove(h.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </span>
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
  defaultValue?: string | undefined;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} required={required} {...rest} />
    </div>
  );
}
