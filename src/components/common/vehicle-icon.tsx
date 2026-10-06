import { Bike, Plane, Zap } from "lucide-react";

import type { VehicleKind } from "@/lib/data/types";

export const kindIcon: Record<VehicleKind, typeof Bike> = {
  scooter: Zap,
  bike: Bike,
  drone: Plane,
};

export function VehicleIcon({ kind, className }: { kind: VehicleKind; className?: string }) {
  const Icon = kindIcon[kind];
  return <Icon className={className} aria-hidden />;
}
