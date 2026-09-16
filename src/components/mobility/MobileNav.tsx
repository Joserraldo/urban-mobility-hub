import { Link } from "@tanstack/react-router";
import { Bike, Cpu, Gauge, Info, LayoutGrid, Menu, Smartphone, Store, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const services = [
  {
    icon: Bike,
    title: "Alquiler multimodal",
    text: "Patinetas, bicis y drones por minutos o entregados a domicilio.",
  },
  {
    icon: Store,
    title: "Venta directa",
    text: "Vehículos urbanos nuevos y seminuevos de nuestra propia flota.",
  },
  {
    icon: LayoutGrid,
    title: "Puntos de servicio",
    text: "Red de hubs para recolección, devolución y recarga.",
  },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full border border-border bg-surface-elevated/90 backdrop-blur"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm border-border bg-sidebar p-0">
        <SheetHeader className="border-b border-border px-5 py-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Zap className="size-5 text-primary-glow" />
            NODO Mobility
          </SheetTitle>
          <SheetDescription>
            Plataforma multimodal de micromovilidad, logística y venta urbana.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto px-5 py-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Servicios
            </h3>
            {services.map((s) => (
              <div
                key={s.title}
                className="flex gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <s.icon className="mt-0.5 size-5 shrink-0 text-primary-glow" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.text}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Quiénes somos
            </h3>
            <p className="text-sm text-muted-foreground">
              Operamos una flota conectada por IoT con un Gemelo Digital de cada vehículo:
              telemetría en vivo, batería, ubicación y alertas de seguridad para decidir en
              segundos.
            </p>
            <Badge variant="secondary" className="gap-1.5">
              <Smartphone className="size-3.5" />
              Próximamente: App nativa iOS/Android en Kotlin Multiplatform
            </Badge>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Panel técnico
            </h3>
            <Link to="/admin">
              <Button variant="secondary" className="w-full justify-start">
                <Gauge className="mr-2 size-4" />
                Dashboard de telemetría
              </Button>
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cpu className="size-3.5" /> Digital Twin en vivo
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
