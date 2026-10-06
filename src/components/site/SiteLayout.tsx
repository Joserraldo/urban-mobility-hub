import { Link } from "@tanstack/react-router";
import { Menu, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMe } from "@/lib/data/queries";

const links = [
  { to: "/catalogo", label: "Catálogo", testId: "nav-catalogo" },
  { to: "/hubs", label: "Hubs", testId: "nav-hubs" },
  { to: "/guias", label: "Guías", testId: "nav-guias" },
  { to: "/faq", label: "Preguntas frecuentes", testId: "nav-faq" },
] as const;

const linkClass = "text-sm text-muted-foreground transition-colors hover:text-foreground";

function AccountLink() {
  const { data: me } = useMe();
  return me ? (
    <Link to="/mis-reservas" data-testid="nav-account">
      <Button variant="ghost" size="sm">
        {me.name.split(" ")[0]}
      </Button>
    </Link>
  ) : (
    <Link to="/login" data-testid="nav-login">
      <Button variant="ghost" size="sm">
        Ingresar
      </Button>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight" data-testid="nav-home">
            <Zap className="size-5 text-primary-glow" aria-hidden />
            NODO Mobility
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className={linkClass} data-testid={l.testId} activeProps={{ className: "text-sm text-foreground" }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <AccountLink />
          </span>
          <Link to="/app" data-testid="nav-app">
            <Button size="sm">Abrir la app</Button>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="md:hidden" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-sidebar">
              <SheetHeader className="text-left">
                <SheetTitle>NODO Mobility</SheetTitle>
                <SheetDescription>Micromovilidad, alquiler y venta urbana.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menú móvil" className="flex flex-col gap-1 px-4">
                {[...links, { to: "/login", label: "Ingresar / Registrarse", testId: "nav-login-mobile" } as const].map((l) => (
                  <SheetClose asChild key={l.to}>
                    <Link to={l.to} className="rounded-lg px-3 py-3 text-base hover:bg-accent" data-testid={l.testId}>
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-4">
        <div className="space-y-2 md:col-span-2">
          <p className="font-semibold">NODO Mobility</p>
          <p className="max-w-md text-muted-foreground">
            Plataforma multimodal de micromovilidad, logística y venta de vehículos urbanos en Bucaramanga. Proyecto académico de
            Ingeniería de Software II — Universidad Autónoma de Bucaramanga. Fase de simulación con gemelos digitales.
          </p>
        </div>
        <nav aria-label="Explorar" className="space-y-2">
          <p className="font-semibold">Explorar</p>
          <ul className="space-y-1.5 text-muted-foreground">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Plataforma" className="space-y-2">
          <p className="font-semibold">Plataforma</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link to="/app" className="hover:text-foreground">
                Aplicación de mapa
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-foreground">
                Panel del operador
              </Link>
            </li>
            <li>
              <a href="/llms.txt" className="hover:text-foreground">
                llms.txt
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NODO Mobility · Tratamiento de datos conforme a la Ley 1581 de 2012
      </p>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function PageHeading({ title, lead, eyebrow }: { title: string; lead?: string | undefined; eyebrow?: string | undefined }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-12 sm:px-6">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {lead && <p className="mt-3 max-w-3xl text-lg text-muted-foreground">{lead}</p>}
    </div>
  );
}
