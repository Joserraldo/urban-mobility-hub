import { Link } from "@tanstack/react-router";
import { BatteryMedium } from "lucide-react";

import { VehicleIcon } from "@/components/common/vehicle-icon";
import { Badge } from "@/components/ui/badge";
import type { Vehicle } from "@/lib/data/types";
import { formatCOP, kindLabel, vehicleSlug } from "@/lib/format";

/** Tarjeta pública de un vehículo en venta (catálogo SEO, RF-02). */
export function VehicleCard({ vehicle: v, hubName }: { vehicle: Vehicle; hubName: string | undefined }) {
  return (
    <article
      data-testid={`vehicle-card-${v.id}`}
      className="relative flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/60"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/20">
        <VehicleIcon kind={v.kind} className="size-5 text-primary-glow" />
      </span>
      <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">{kindLabel[v.kind]}</p>
      <h3 className="mt-1 text-lg font-semibold">
        <Link to="/catalogo/$slug" params={{ slug: vehicleSlug(v) }} className="after:absolute after:inset-0 hover:text-primary-glow">
          {v.model}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{v.spec}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {v.condition && (
          <Badge variant="secondary" className="capitalize">
            {v.condition}
          </Badge>
        )}
        {hubName && <span className="text-xs text-muted-foreground">Hub: {hubName}</span>}
        {v.mode === "rent" && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <BatteryMedium className="size-3.5" aria-hidden />
            {v.battery}%
          </span>
        )}
      </div>
      <p className="mt-auto pt-4 text-xl font-bold text-primary-glow">
        {v.mode === "sale" ? formatCOP(v.price ?? 0) : `${formatCOP(v.pricePerMinute ?? 0)} / min`}
      </p>
    </article>
  );
}
