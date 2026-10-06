import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Compass, TriangleAlert, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function StatusScreen({
  icon,
  title,
  message,
  children,
  testId,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4"
    >
      <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
      <div className="relative w-full max-w-md text-center">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Zap className="size-4 text-primary-glow" aria-hidden />
          NODO Mobility
        </Link>
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-surface">
          {icon}
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <StatusScreen
      testId="not-found"
      icon={<Compass className="size-7 text-primary-glow" aria-hidden />}
      title="No encontramos esta página"
      message="Puede que el enlace esté roto o que el recurso ya no exista. Revisa la dirección o vuelve al inicio."
    >
      <Button asChild>
        <Link to="/">Ir al inicio</Link>
      </Button>
      <Button asChild variant="secondary">
        <Link to="/app">Abrir la app</Link>
      </Button>
    </StatusScreen>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <StatusScreen
      testId="root-error"
      icon={<TriangleAlert className="size-7 text-destructive" aria-hidden />}
      title="No pudimos cargar la página"
      message="Algo falló de nuestro lado. Intenta de nuevo o vuelve al inicio."
    >
      <Button
        onClick={() => {
          void router.invalidate();
          reset();
        }}
      >
        Reintentar
      </Button>
      <Button asChild variant="secondary">
        <Link to="/">Ir al inicio</Link>
      </Button>
    </StatusScreen>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#09090b" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
