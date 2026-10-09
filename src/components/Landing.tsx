import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  Cpu,
  Gauge,
  HelpCircle,
  Mail,
  MapPin,
  Navigation,
  Plane,
  QrCode,
  Radar,
  Route,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Store,
  Timer,
  Truck,
  Bike,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import heroImage from "@/assets/hero-mobility.jpg";
import bicicletaImg from "@/assets/vehiculo-bicicleta.jpg";
import courierImg from "@/assets/domiciliario.jpg";
import dronImg from "@/assets/vehiculo-dron.jpg";
import hubImg from "@/assets/hub-estacion.jpg";
import patinetaImg from "@/assets/vehiculo-patineta.jpg";
import { VehicleCard } from "@/components/catalog/VehicleCard";
import { EmptyState } from "@/components/common/states";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FAQ } from "@/content/faq";
import { formatCOP } from "@/lib/format";
import type { Hub, Vehicle, VehicleKind } from "@/lib/data/types";

/**
 * Fotos de vehículos reales (Wikimedia Commons, uso libre).
 * - vehiculo-patineta.jpg · CC0 · "Electric kick scooter parking"
 * - vehiculo-bicicleta.jpg · CC BY-SA 4.0 · "Cowboy 3 pedelec"
 * - vehiculo-dron.jpg · CC BY-SA 4.0 · "Zipline package drop"
 * - domiciliario.jpg · CC0 · "Moscow, Yandex courier on a bicycle"
 * - hub-estacion.jpg · CC BY 4.0 · "Electric scooter rack, Harvard"
 * El hero (hero-mobility.jpg) es asset propio del proyecto.
 */

export type Tarifas = {
  kinds: { kind: VehicleKind; from: number; to: number }[];
  deliveryReady: number;
  saleFrom: number | null;
  saleTo: number | null;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const services = [
  {
    icon: Bike,
    title: "Alquiler multimodal",
    text: "Patinetas, bicicletas eléctricas y drones por minuto o entregados en tu puerta.",
    tags: ["Por minuto", "A domicilio", "Drones"],
    img: patinetaImg,
    alt: "Patineta eléctrica de alquiler aparcada en la calle",
  },
  {
    icon: Store,
    title: "Venta directa",
    text: "Vehículos urbanos nuevos y seminuevos de nuestra propia flota, con ficha técnica y precio en pesos colombianos.",
    tags: ["Nuevos", "Seminuevos"],
    img: bicicletaImg,
    alt: "Bicicleta eléctrica premium disponible para la venta",
  },
  {
    icon: LayoutGrid,
    title: "Hubs de servicio",
    text: "Estaciones para recoger, devolver y recargar, con stock de venta en cada punto.",
    tags: ["Recolección", "Devolución", "Recarga"],
    img: hubImg,
    alt: "Estación de recolección y recarga de patinetas eléctricas",
  },
];

const steps = [
  {
    icon: Route,
    title: "Elige",
    text: "Encuentra un vehículo o un hub en el mapa y revisa batería y tarifa.",
  },
  {
    icon: QrCode,
    title: "Verifica",
    text: "Escanea el QR y confirma tu casco con la cámara. Sin casco no hay viaje.",
  },
  {
    icon: Timer,
    title: "Viaja",
    text: "Inicia el viaje; pagas por minuto y lo devuelves en cualquier hub.",
  },
];

const flotaMarquee = [
  { img: patinetaImg, label: "Patinetas eléctricas", tag: "Alquiler por minuto" },
  { img: bicicletaImg, label: "Bicicletas eléctricas", tag: "Venta directa" },
  { img: dronImg, label: "Drones de carga", tag: "Última milla" },
  { img: courierImg, label: "Domiciliarios", tag: "Entrega a tu puerta" },
  { img: hubImg, label: "Hubs inteligentes", tag: "Recoge, devuelve, recarga" },
];

const tarifaImg: Record<VehicleKind, string> = {
  scooter: patinetaImg,
  bike: bicicletaImg,
  drone: dronImg,
};
const tarifaLabel: Record<VehicleKind, string> = {
  scooter: "Patineta eléctrica",
  bike: "Bicicleta eléctrica",
  drone: "Dron de carga",
};

/** Entrada por scroll. En SSR el HTML queda visible (SEO); al hidratar se anima. */
function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hidden = mounted && !reduced;
  return (
    <motion.div
      className={className ? `min-w-0 ${className}` : "min-w-0"}
      initial={hidden ? { opacity: 0, y } : false}
      {...(hidden
        ? {
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, margin: "-70px" },
          }
        : {})}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Contador animado que arranca al entrar en el viewport (stats del hero). */
function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced) {
      setN(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry || !entry.isIntersecting) return;
        const start = performance.now();
        const dur = 950;
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, reduced]);
  return (
    <span ref={ref} className={className}>
      {n}
    </span>
  );
}

/** Punto de estado "en vivo" reutilizable (hero y tarjeta de entrega). */
function LiveDot() {
  return (
    <span className="relative flex size-2" aria-hidden>
      <span className="absolute inline-flex size-full rounded-full bg-success/60 pulse-ring" />
      <span className="relative inline-flex size-2 rounded-full bg-success" />
    </span>
  );
}

export function Landing({
  hubs,
  featured,
  vehicleCount,
  tarifas,
}: {
  hubs: Hub[];
  featured: Vehicle[];
  vehicleCount: number;
  tarifas: Tarifas;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const motionOn = mounted && !reduced;

  // Parallax del hero: la imagen se desplaza y el brillo se atenúa al hacer scroll.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImgY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const heroGlowOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.35]);
  const heroFade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const heroInitial = (i: number) =>
    motionOn ? { opacity: 0, y: 26, filter: "blur(4px)" } : false;
  const heroProps = (i: number) =>
    motionOn
      ? {
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.7, delay: 0.08 * i, ease: EASE },
        }
      : {};

  return (
    <SiteLayout>
      {/* Hero */}
      <section ref={heroRef} data-testid="landing-hero" className="relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-hero"
          aria-hidden
          style={{ opacity: heroGlowOpacity }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <motion.div className="space-y-6" {...(motionOn ? { style: { opacity: heroFade } } : {})}>
            <motion.div initial={heroInitial(0)} {...heroProps(0)}>
              <Badge variant="secondary" className="gap-1.5">
                <LiveDot />
                <Radar className="size-3.5 text-primary-glow" aria-hidden />
                Flota conectada · Gemelos digitales en vivo
              </Badge>
            </motion.div>
            <motion.h1
              initial={heroInitial(1)}
              {...heroProps(1)}
              className="text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl"
            >
              Micromovilidad en Bucaramanga:{" "}
              <span className="text-gradient">alquila por minuto</span>, recibe a domicilio o
              compra.
            </motion.h1>
            <motion.p
              initial={heroInitial(2)}
              {...heroProps(2)}
              className="max-w-xl text-lg text-muted-foreground"
            >
              Patinetas eléctricas, bicicletas eléctricas y drones de carga sobre una red de hubs
              inteligentes, con verificación de casco y alertas de seguridad en tiempo real.
            </motion.p>
            <motion.div initial={heroInitial(3)} {...heroProps(3)} className="flex flex-wrap gap-3">
              <Link to="/app" data-testid="landing-cta-demo">
                <Button size="lg" className="group shadow-glow">
                  Probar la demo interactiva
                  <ArrowRight
                    className="ml-2 size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Button>
              </Link>
              <Link to="/catalogo" data-testid="landing-cta-catalogo">
                <Button size="lg" variant="secondary">
                  Ver catálogo de venta
                </Button>
              </Link>
            </motion.div>
            <motion.dl
              initial={heroInitial(4)}
              {...heroProps(4)}
              className="grid max-w-md grid-cols-3 gap-4 pt-2"
            >
              {[
                ["Vehículos", <CountUp key="v" value={vehicleCount} />],
                ["Hubs activos", <CountUp key="h" value={hubs.filter((h) => h.active).length} />],
                ["Ciudad", "Bucaramanga"],
              ].map(([label, value]) => (
                <div key={label as string} className="group/stat">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="text-xl font-bold transition-colors group-hover/stat:text-primary-glow sm:text-2xl">
                    {value}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>
          <motion.div initial={heroInitial(5)} {...heroProps(5)} className="relative">
            <div className="overflow-hidden rounded-3xl border border-border shadow-glow">
              <motion.img
                src={heroImage}
                alt="Patineta eléctrica y bicicleta eléctrica en una calle nocturna iluminada en azul"
                width={1600}
                height={1008}
                fetchPriority="high"
                decoding="async"
                style={{ y: heroImgY }}
                className="h-full w-full scale-110 object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent"
                aria-hidden
              />
            </div>
            <div className="absolute -bottom-4 left-5 hidden items-center gap-2 rounded-full border border-border bg-surface/95 px-4 py-2 text-xs font-medium shadow-panel backdrop-blur sm:flex">
              <MapPin className="size-3.5 text-primary-glow" aria-hidden />
              Bucaramanga · Santander
            </div>
          </motion.div>
        </div>
        <motion.div
          className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 lg:block"
          initial={{ opacity: 0 }}
          {...(motionOn ? { animate: { opacity: 1, y: [0, 6, 0] } } : {})}
          transition={{ delay: 1.1, duration: 2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <ChevronDown className="size-5 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Flota real en marquee (fotos reales) */}
      <section aria-label="Nuestra flota" className="border-y border-border bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              La flota, en fotos reales
            </p>
          </Reveal>
          <div className="mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
            <div className="marquee-track flex w-max gap-4">
              {[0, 1].map((dup) => (
                <ul key={dup} aria-hidden={dup === 1} className="flex gap-4">
                  {flotaMarquee.map((item) => (
                    <li
                      key={item.label}
                      className="group relative w-64 overflow-hidden rounded-2xl border border-border bg-surface"
                    >
                      <img
                        src={item.img}
                        alt={item.label}
                        width={1200}
                        height={800}
                        loading="lazy"
                        decoding="async"
                        className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="flex items-center justify-between gap-2 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold leading-tight">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.tag}</p>
                        </div>
                        <ArrowUpRight
                          className="size-4 shrink-0 text-primary-glow opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Respuesta directa (AEO) */}
      <section aria-labelledby="que-es" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Reveal>
          <h2 id="que-es" className="text-2xl font-bold tracking-tight">
            ¿Qué es NODO Mobility?
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            NODO Mobility es una plataforma de micromovilidad que permite{" "}
            <strong className="text-foreground">alquilar por minuto</strong> o{" "}
            <strong className="text-foreground">comprar</strong> patinetas eléctricas, bicicletas
            eléctricas y drones de carga, y operar la flota desde un panel con gemelos digitales.
            Funciona en Bucaramanga, Santander (Colombia), como proyecto académico de la Universidad
            Autónoma de Bucaramanga en fase de simulación.
          </p>
        </Reveal>
      </section>

      {/* Servicios */}
      <section
        id="servicios"
        aria-labelledby="servicios-t"
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6"
      >
        <Reveal>
          <h2 id="servicios-t" className="text-3xl font-bold tracking-tight">
            Una plataforma, tres servicios
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow">
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.alt}
                    width={1200}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute bottom-3 left-4 flex size-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold transition-colors group-hover:text-primary-glow">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Entrega a domicilio + pago (UC05→UC14–UC19) */}
      <section aria-labelledby="domicilio-t" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-5">
              <h2 id="domicilio-t" className="text-3xl font-bold tracking-tight">
                También llega a tu puerta:{" "}
                <span className="text-gradient">domiciliarios reales</span>
              </h2>
              <p className="text-muted-foreground">
                Al alquilar puedes elegir{" "}
                <strong className="text-foreground">entrega a domicilio</strong>. Un operador asigna
                tu reserva a un domiciliario con hora límite; el domiciliario sigue el ciclo{" "}
                <em>asignada → en camino → entregada</em> desde su propia bandeja. Si la entrega se
                pasa del plazo, el sistema avisa por correo a ti y a operación (integración Brevo):
                el retraso no se esconde.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {(
                  [
                    [
                      "El pago es un paso con comprobante: cada intento queda registrado con su referencia de pasarela.",
                      CreditCard,
                    ],
                    [
                      "Bandeja dedicada del domiciliario en /entregas, ordenada por vencimiento.",
                      Truck,
                    ],
                    [
                      "Entrega tardía detectada por reloj: correo automático a cliente y operador.",
                      Mail,
                    ],
                  ] as const
                ).map(([text, Icon]) => (
                  <li key={text} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary-glow" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>
              <Link to="/app" data-testid="landing-cta-domicilio">
                <Button variant="secondary" className="group">
                  Alquilar con entrega a domicilio
                  <ArrowRight
                    className="ml-2 size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Button>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-panel">
              <img
                src={courierImg}
                alt="Domiciliario en bicicleta eléctrica entregando un pedido"
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
                className="h-64 w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-background/70 to-transparent p-4">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <LiveDot />
                  En vivo
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Navigation className="size-3.5 text-primary-glow" aria-hidden />
                  Última milla
                </span>
              </div>
              <div className="space-y-3 p-5">
                <p className="text-sm font-semibold">Cómo se ve una entrega por dentro</p>
                <p className="text-xs text-muted-foreground">
                  Estados reales de la tabla deliveries, como los ve el domiciliario.
                </p>
                <ul className="space-y-3 pt-1">
                  {(
                    [
                      ["Patineta Volt S2 → Calle 45 #1-23", "asignada", "deadline 45 min"],
                      ["Bicicleta Urban-E → La Punta", "en camino", "faltan 20:14 min"],
                      ["Dron AeroLift → Cabecera", "tardía", "aviso por correo enviado"],
                      ["Patineta Volt Pro → El Jardín", "entregada", "19:42"],
                    ] as const
                  ).map(([label, status, detail]) => (
                    <li
                      key={label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm transition-colors hover:border-border"
                    >
                      <span className="min-w-0 truncate">{label}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">{detail}</span>
                        <span
                          className={
                            status === "tardía"
                              ? "rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive"
                              : status === "entregada"
                                ? "rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"
                                : "rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-glow"
                          }
                        >
                          {status}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Cómo funciona */}
      <section aria-labelledby="como-t" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Reveal>
            <h2 id="como-t" className="text-3xl font-bold tracking-tight">
              Cómo funciona: 3 pasos
            </h2>
          </Reveal>
          <ol className="relative mt-8 grid gap-6 md:grid-cols-3">
            <div
              className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent md:block"
              aria-hidden
            />
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <li className="group relative rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-gradient-primary font-bold text-primary-foreground shadow-glow transition-transform group-hover:scale-105">
                      {i + 1}
                    </span>
                    <s.icon className="size-5 text-primary-glow" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Tarifas reales */}
      <section aria-labelledby="tarifas-t" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Reveal>
          <div className="flex items-end justify-between gap-4">
            <h2 id="tarifas-t" className="text-3xl font-bold tracking-tight">
              Tarifas y precios, en pesos
            </h2>
            <Link to="/catalogo" className="text-sm text-primary-glow hover:underline">
              Precios de venta en el catálogo
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {tarifas.kinds.map((t, i) => (
            <Reveal key={t.kind} delay={i * 0.08}>
              <div className="group overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow">
                <div className="relative h-24 overflow-hidden">
                  <img
                    src={tarifaImg[t.kind]}
                    alt={tarifaLabel[t.kind]}
                    width={1200}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"
                    aria-hidden
                  />
                </div>
                <div className="p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {tarifaLabel[t.kind]}
                  </p>
                  <p className="mt-3 text-3xl font-bold">
                    {formatCOP(t.from)}
                    {t.to > t.from ? (
                      <span className="text-base font-medium text-muted-foreground">
                        {" "}
                        – {formatCOP(t.to)}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    por minuto · cobro con redondeo hacia arriba · prepago de {formatCOP(10_000)} al
                    reservar
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <p className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Truck className="size-4 text-primary-glow" aria-hidden />
              {tarifas.deliveryReady} vehículos aptos para entrega a domicilio
            </span>
            {tarifas.saleFrom !== null && (
              <span className="flex items-center gap-2">
                <Store className="size-4 text-primary-glow" aria-hidden />
                Venta desde {formatCOP(tarifas.saleFrom)}
                {tarifas.saleTo && tarifas.saleTo > tarifas.saleFrom
                  ? ` hasta ${formatCOP(tarifas.saleTo)}`
                  : ""}
              </span>
            )}
          </p>
        </Reveal>
      </section>

      {/* Seguridad IoT / gemelos digitales */}
      <section aria-labelledby="seguridad-t" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Reveal>
            <h2
              id="seguridad-t"
              className="flex items-center gap-2 text-3xl font-bold tracking-tight"
            >
              <ShieldAlert className="size-6 text-primary-glow" aria-hidden />
              Cada viaje supervisado por su gemelo digital
            </h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Cada vehículo tiene una réplica en vivo (posición, batería, sensores). Cuatro reglas
              se evalúan muestra a muestra; si algo falla, la alerta llega al panel del operador en
              menos de un segundo y queda escrita en una bitácora auditable que solo se agrega,
              nunca se modifica.
            </p>
          </Reveal>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [
                  "Sin casco",
                  "no arranca y, si te lo quitas en marcha, se registra el incidente",
                  ShieldCheck,
                ],
                ["Caída / impacto", "aceleración ≥ 3 G dispara alerta de accidente", Gauge],
                ["Pérdida de GPS", "más de 10 s sin fix válido sobre la posición esperada", Radar],
                ["Batería crítica", "por debajo del 15 % se programa la recolección", Cpu],
              ] as const
            ).map(([t, d, Icon], i) => (
              <Reveal key={t} delay={i * 0.07}>
                <div className="group h-full rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow">
                  <Icon
                    className="size-5 text-primary-glow transition-transform group-hover:scale-110"
                    aria-hidden
                  />
                  <dt className="mt-3 font-semibold">{t}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{d}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Destacados */}
      <section aria-labelledby="destacados-t" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Reveal>
          <div className="flex items-end justify-between gap-4">
            <h2 id="destacados-t" className="text-3xl font-bold tracking-tight">
              Vehículos en venta
            </h2>
            <Link to="/catalogo" className="text-sm text-primary-glow hover:underline">
              Ver todo el catálogo
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <EmptyState
                title="Todavía no hay vehículos publicados en venta"
                hint="El catálogo se actualiza a diario. Vuelve pronto para ver los nuevos ingresos."
                action={
                  <Link to="/app" className="mt-2">
                    <Button size="sm" variant="secondary">
                      Explorar el mapa
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            featured.map((v, i) => (
              <Reveal key={v.id} delay={(i % 4) * 0.07}>
                <VehicleCard vehicle={v} hubName={hubs.find((h) => h.id === v.hubId)?.name} />
              </Reveal>
            ))
          )}
        </div>
      </section>

      {/* Quiénes somos + hubs */}
      <section id="nosotros" className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-5">
              <h2 className="text-3xl font-bold tracking-tight">Quiénes somos</h2>
              <p className="text-muted-foreground">
                Somos un equipo de tres estudiantes de Ingeniería de Sistemas de la Universidad
                Autónoma de Bucaramanga. Construimos una plataforma donde cada vehículo tiene un{" "}
                <strong className="text-foreground">gemelo digital</strong>: una réplica en vivo con
                su posición, batería y alertas, que permite al operador monitorear la flota y
                validar condiciones de seguridad antes de cada viaje.
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
          </Reveal>

          <Reveal delay={0.1}>
            <div id="red" className="rounded-3xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Red de hubs
              </h3>
              <ul className="mt-3 divide-y divide-border">
                {hubs.map((h) => (
                  <li key={h.id}>
                    <Link
                      to="/hubs/$hubId"
                      params={{ hubId: h.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5 transition-colors hover:text-primary-glow"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{h.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {h.zone}
                        </span>
                      </span>
                      <Badge variant={h.active ? "default" : "secondary"}>
                        {h.active ? `${h.occupied}/${h.capacity}` : "Inactivo"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ resumida */}
      <section aria-labelledby="faq-t" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Reveal>
          <h2 id="faq-t" className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <HelpCircle className="size-6 text-primary-glow" aria-hidden />
            Preguntas frecuentes
          </h2>
          <dl className="mt-8 grid gap-4 md:grid-cols-2">
            {FAQ.slice(0, 4).map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-surface p-5">
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
          <Link to="/faq" className="mt-6 inline-block text-sm text-primary-glow hover:underline">
            Ver todas las preguntas frecuentes
          </Link>
        </Reveal>
      </section>

      {/* CTA final: entra con las cuentas de demostración */}
      <section aria-labelledby="cta-t" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-10">
            <div className="absolute inset-0 bg-gradient-hero opacity-60" aria-hidden />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <h2 id="cta-t" className="text-3xl font-bold tracking-tight">
                  Entra ahora: la plataforma completa, funcionando
                </h2>
                <p className="mt-3 max-w-xl text-muted-foreground">
                  Mapa con flota en vivo, desbloqueo con QR y casco, pagos con comprobante, bandeja
                  de domiciliario y panel de operación con alertas IoT. Es una simulación académica
                  (UNAB) con software real: mismo flujo, mismos datos, mismos estados que verías en
                  producción.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/app" data-testid="landing-cta-app">
                    <Button size="lg" className="group shadow-glow">
                      Abrir la app de mapa
                      <ArrowRight
                        className="ml-2 size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Button>
                  </Link>
                  <Link to="/entregas" data-testid="landing-cta-courier">
                    <Button size="lg" variant="secondary">
                      Bandeja del domiciliario
                    </Button>
                  </Link>
                  <Link to="/admin" data-testid="landing-cta-admin">
                    <Button size="lg" variant="secondary">
                      Panel del operador
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-5 text-sm">
                <p className="font-semibold">Cuentas de demostración</p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Cliente</span>
                    <code className="text-xs">cliente@demo.co</code>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Domiciliario</span>
                    <code className="text-xs">domi1@demo.co</code>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Operador</span>
                    <code className="text-xs">operador@demo.co</code>
                  </li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Contraseña para las tres: <code>Demo1234!</code>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
