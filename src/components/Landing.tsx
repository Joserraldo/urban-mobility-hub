import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Cpu,
  HelpCircle,
  Plane,
  QrCode,
  Radar,
  Route,
  ShieldCheck,
  Smartphone,
  Store,
  Timer,
  Bike,
  LayoutGrid,
} from "lucide-react";

import heroImage from "@/assets/hero-mobility.jpg";
import { VehicleCard } from "@/components/catalog/VehicleCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FAQ } from "@/content/faq";
import type { Hub, Vehicle } from "@/lib/data/types";

const services = [
  {
    icon: Bike,
    title: "Alquiler multimodal",
    text: "Patinetas, bicicletas eléctricas y drones por minuto o entregados en tu puerta.",
    tags: ["Por minuto", "A domicilio", "Drones"],
  },
  {
    icon: Store,
    title: "Venta directa",
    text: "Vehículos urbanos nuevos y seminuevos de nuestra propia flota, con ficha técnica y precio en pesos colombianos.",
    tags: ["Nuevos", "Seminuevos"],
  },
  {
    icon: LayoutGrid,
    title: "Hubs de servicio",
    text: "Estaciones para recoger, devolver y recargar, con stock de venta en cada punto.",
    tags: ["Recolección", "Devolución", "Recarga"],
  },
];

const steps = [
  { icon: Route, title: "Elige", text: "Encuentra un vehículo o un hub en el mapa y revisa batería y tarifa." },
  { icon: QrCode, title: "Verifica", text: "Escanea el QR y confirma tu casco con la cámara. Sin casco no hay viaje." },
  { icon: Timer, title: "Viaja", text: "Inicia el viaje; pagas por minuto y lo devuelves en cualquier hub." },
];

export function Landing({ hubs, featured, vehicleCount }: { hubs: Hub[]; featured: Vehicle[]; vehicleCount: number }) {
  return (
    <SiteLayout>
      {/* Hero */}
      <section data-testid="landing-hero" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-1.5">
              <Radar className="size-3.5 text-primary-glow" aria-hidden />
              Flota conectada · Gemelos digitales en vivo
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
              Micromovilidad en Bucaramanga: <span className="text-gradient">alquila por minuto</span>, recibe a domicilio o compra.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Patinetas eléctricas, bicicletas eléctricas y drones de carga sobre una red de hubs inteligentes, con verificación de casco y
              alertas de seguridad en tiempo real.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/app" data-testid="landing-cta-demo">
                <Button size="lg" className="shadow-glow">
                  Probar la demo interactiva
                  <ArrowRight className="ml-2 size-4" aria-hidden />
                </Button>
              </Link>
              <Link to="/catalogo" data-testid="landing-cta-catalogo">
                <Button size="lg" variant="secondary">
                  Ver catálogo de venta
                </Button>
              </Link>
            </div>
            <dl className="grid max-w-md grid-cols-3 gap-4 pt-2">
              {[
                ["Vehículos", vehicleCount],
                ["Hubs activos", hubs.filter((h) => h.active).length],
                ["Ciudad", "Bucaramanga"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="text-xl font-bold sm:text-2xl">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border shadow-glow">
            <img
              src={heroImage}
              alt="Patineta eléctrica y bicicleta eléctrica en una calle nocturna iluminada en azul"
              width={1600}
              height={1008}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Respuesta directa (AEO) */}
      <section aria-labelledby="que-es" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 id="que-es" className="text-2xl font-bold tracking-tight">
          ¿Qué es NODO Mobility?
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          NODO Mobility es una plataforma de micromovilidad que permite <strong className="text-foreground">alquilar por minuto</strong> o{" "}
          <strong className="text-foreground">comprar</strong> patinetas eléctricas, bicicletas eléctricas y drones de carga, y operar la flota
          desde un panel con gemelos digitales. Funciona en Bucaramanga, Santander (Colombia), como proyecto académico de la Universidad
          Autónoma de Bucaramanga en fase de simulación.
        </p>
      </section>

      {/* Servicios */}
      <section id="servicios" aria-labelledby="servicios-t" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 id="servicios-t" className="text-3xl font-bold tracking-tight">
          Una plataforma, tres servicios
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {services.map((s) => (
            <article key={s.title} className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/60">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/20">
                <s.icon className="size-5 text-primary-glow" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section aria-labelledby="como-t" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="como-t" className="text-3xl font-bold tracking-tight">
            Cómo funciona: 3 pasos
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-border bg-surface p-6">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gradient-primary font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="size-5 text-primary-glow" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Destacados */}
      <section aria-labelledby="destacados-t" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 id="destacados-t" className="text-3xl font-bold tracking-tight">
            Vehículos en venta
          </h2>
          <Link to="/catalogo" className="text-sm text-primary-glow hover:underline">
            Ver todo el catálogo
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((v) => (
            <VehicleCard key={v.id} vehicle={v} hubName={hubs.find((h) => h.id === v.hubId)?.name} />
          ))}
        </div>
      </section>

      {/* Quiénes somos + hubs */}
      <section id="nosotros" className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold tracking-tight">Quiénes somos</h2>
            <p className="text-muted-foreground">
              Somos un equipo de tres estudiantes de Ingeniería de Sistemas de la Universidad Autónoma de Bucaramanga. Construimos una
              plataforma donde cada vehículo tiene un <strong className="text-foreground">gemelo digital</strong>: una réplica en vivo con su
              posición, batería y alertas, que permite al operador monitorear la flota y validar condiciones de seguridad antes de cada viaje.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {(
                [
                  ["Telemetría por vehículo en tiempo real", Cpu],
                  ["Verificación de casco con cámara", ShieldCheck],
                  ["Logística de última milla con drones", Plane],
                ] as const
              ).map(([text, Icon]) => (
                <li key={text} className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0 text-primary-glow" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
            <Badge variant="secondary" className="gap-1.5">
              <Smartphone className="size-3.5" aria-hidden />
              Aplicación web instalable (PWA)
            </Badge>
          </div>

          <div id="red" className="rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Red de hubs</h3>
            <ul className="mt-5 space-y-3">
              {hubs.map((h) => (
                <li key={h.id}>
                  <Link
                    to="/hubs/$hubId"
                    params={{ hubId: h.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border bg-surface-elevated p-4 transition-colors hover:border-primary/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{h.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{h.zone}</span>
                    </span>
                    <Badge variant={h.active ? "default" : "secondary"}>
                      {h.active ? `${h.occupied}/${h.capacity}` : "Inactivo"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ resumida */}
      <section aria-labelledby="faq-t" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="faq-t" className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <HelpCircle className="size-6 text-primary-glow" aria-hidden />
          Preguntas frecuentes
        </h2>
        <dl className="mt-8 grid gap-4 md:grid-cols-2">
          {FAQ.slice(1, 5).map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-surface p-5">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
        <Link to="/faq" className="mt-6 inline-block text-sm text-primary-glow hover:underline">
          Ver todas las preguntas frecuentes
        </Link>
      </section>
    </SiteLayout>
  );
}
