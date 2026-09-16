import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bike,
  Cpu,
  Gauge,
  LayoutGrid,
  Plane,
  Radar,
  Smartphone,
  Store,
  Zap,
} from "lucide-react";

import heroImage from "@/assets/hero-mobility.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hubs, vehicles } from "@/lib/fleet-data";

const services = [
  {
    icon: Bike,
    title: "Alquiler multimodal",
    text: "Patinetas, bicis eléctricas y drones de carga disponibles por minutos o entregados directamente en tu puerta.",
    tags: ["Por minuto", "A domicilio", "Drones"],
  },
  {
    icon: Store,
    title: "Venta directa",
    text: "Compra vehículos urbanos nuevos y seminuevos que ya operaron en nuestra flota, con historial de telemetría verificable.",
    tags: ["Nuevos", "Seminuevos", "Garantía"],
  },
  {
    icon: LayoutGrid,
    title: "Puntos de servicio / Hubs",
    text: "Red de estaciones físicas para recolección, devolución y recarga, con stock de venta y mantenimiento preventivo.",
    tags: ["Recolección", "Devolución", "Recarga"],
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-6">
            <span className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
              <Zap className="size-5 text-primary-glow" />
              NODO Mobility
            </span>
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
              <a href="#servicios" className="transition-colors hover:text-foreground">
                Servicios
              </a>
              <a href="#nosotros" className="transition-colors hover:text-foreground">
                Quiénes somos
              </a>
              <a href="#red" className="transition-colors hover:text-foreground">
                Red de hubs
              </a>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <Gauge className="mr-2 size-4" />
                Digital Twin
              </Button>
            </Link>
            <Link to="/app">
              <Button size="sm">
                Ir a la Web App / Probar demo
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-7"
          >
            <Badge variant="secondary" className="gap-1.5">
              <Radar className="size-3.5 text-primary-glow" />
              Flota conectada · Gemelos digitales en vivo
            </Badge>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
              Movilidad urbana <span className="text-gradient">por minuto, a domicilio</span> o para
              quedártela.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Alquila patinetas, bicis eléctricas y drones de carga en segundos, recíbelos donde
              estés o compra vehículos urbanos de nuestra propia flota. Todo sobre una red de hubs
              inteligentes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/app">
                <Button size="lg" className="shadow-glow">
                  Probar la demo interactiva
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <a href="#servicios">
                <Button size="lg" variant="secondary">
                  Ver servicios
                </Button>
              </a>
            </div>
            <dl className="grid max-w-md grid-cols-3 gap-4 pt-4">
              {[
                ["Vehículos", vehicles.length * 46],
                ["Hubs activos", hubs.filter((h) => h.active).length],
                ["Ciudades", 3],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="text-2xl font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl border border-border shadow-glow"
          >
            <img
              src={heroImage}
              alt="Patineta eléctrica y bicicleta eléctrica en una calle nocturna iluminada en azul"
              width={1600}
              height={1008}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.13_0.005_285/0.9),transparent_60%)]" />
          </motion.div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight">Una plataforma, tres negocios</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Micromovilidad, logística ligera y comercio de vehículos urbanos operando sobre la misma
          infraestructura conectada.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {services.map((s, i) => (
            <motion.article
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/60"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/20">
                <s.icon className="size-5 text-primary-glow" />
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
            </motion.article>
          ))}
        </div>
      </section>

      {/* Quiénes somos */}
      <section id="nosotros" className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold tracking-tight">Quiénes somos</h2>
            <p className="text-muted-foreground">
              Somos un equipo de ingeniería que operó flotas urbanas antes de construir esta
              plataforma. Cada vehículo lleva un módulo IoT que reporta batería, posición, uso y
              eventos de seguridad a su <span className="text-foreground">Gemelo Digital</span>: una
              réplica en vivo que permite predecir mantenimiento, redistribuir unidades entre hubs y
              validar condiciones de seguridad antes de cada viaje.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {(
                [
                  ["Telemetría por vehículo en tiempo real", Cpu],
                  ["Verificación de casco asistida por IA", Radar],
                  ["Logística de última milla con drones", Plane],
                ] as const
              ).map(([text, Icon]) => (
                <li key={text} className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0 text-primary-glow" />
                  {text}
                </li>
              ))}
            </ul>
            <Badge variant="secondary" className="gap-1.5">
              <Smartphone className="size-3.5" />
              Próximamente: App nativa iOS/Android en Kotlin Multiplatform
            </Badge>
          </div>

          <div id="red" className="rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Red de hubs
            </h3>
            <div className="mt-5 space-y-3">
              {hubs.map((h) => (
                <div
                  key={h.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border bg-surface-elevated p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{h.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{h.zone}</p>
                  </div>
                  <Badge variant={h.active ? "default" : "secondary"}>
                    {h.occupied}/{h.capacity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <p>© {new Date().getFullYear()} NODO Mobility · MVP demostrativo</p>
          <Link to="/app" className="text-foreground hover:text-primary-glow">
            Abrir Web App
          </Link>
        </div>
      </footer>
    </div>
  );
}
