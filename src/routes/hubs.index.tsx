import { createFileRoute, Link } from "@tanstack/react-router";
import { BatteryCharging } from "lucide-react";

import { RouteError, RoutePending } from "@/components/common/route-states";
import { EmptyState } from "@/components/common/states";
import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDataSource } from "@/lib/data";
import { SITE, breadcrumbLd, seo } from "@/lib/site";

export const Route = createFileRoute("/hubs/")({
  loader: async () => ({ hubs: await getDataSource().listHubs() }),
  head: ({ loaderData }) =>
    seo({
      title: "Hubs de micromovilidad en Bucaramanga",
      description:
        "Red de hubs NODO Mobility en Bucaramanga: puntos para recoger, devolver y cargar patinetas, bicicletas eléctricas y drones, con ocupación y vehículos en carga.",
      path: "/hubs",
      jsonLd: [
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name: "Hubs", path: "/hubs" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: (loaderData?.hubs ?? []).map((h, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE.url}/hubs/${h.id}`,
            name: h.name,
          })),
        },
      ],
    }),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: HubsPage,
});

function HubsPage() {
  const { hubs } = Route.useLoaderData();
  return (
    <SiteLayout>
      <PageHeading
        eyebrow="Red"
        title="Hubs de servicio"
        lead="Un hub es un punto físico donde se recogen, devuelven y cargan los vehículos, y donde está el stock de venta. Consulta su capacidad y ocupación."
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {hubs.length === 0 ? (
          <EmptyState title="Aún no hay hubs registrados" />
        ) : (
          <ul data-testid="hub-list" className="grid gap-6 md:grid-cols-2">
            {hubs.map((h) => (
              <li key={h.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      <Link to="/hubs/$hubId" params={{ hubId: h.id }} className="hover:text-primary-glow">
                        {h.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">{h.zone}</p>
                  </div>
                  <Badge variant={h.active ? "default" : "secondary"}>{h.active ? "Activo" : "Inactivo"}</Badge>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Ocupación</span>
                    <span>
                      {h.occupied}/{h.capacity} espacios
                    </span>
                  </div>
                  <Progress value={(h.occupied / h.capacity) * 100} className="mt-2" aria-label={`Ocupación de ${h.name}`} />
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BatteryCharging className="size-3.5 text-success" aria-hidden />
                    {h.charging} vehículos en carga
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
