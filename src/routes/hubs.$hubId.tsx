import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { RouteError, RoutePending } from "@/components/common/route-states";
import { EmptyState } from "@/components/common/states";
import { VehicleCard } from "@/components/catalog/VehicleCard";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDataSource } from "@/lib/data";
import { formatCOP, kindLabel } from "@/lib/format";
import { SITE, breadcrumbLd, seo } from "@/lib/site";

export const Route = createFileRoute("/hubs/$hubId")({
  loader: async ({ params }) => {
    const ds = getDataSource();
    const hub = await ds.getHub(params.hubId.toUpperCase());
    if (!hub) throw notFound();
    const vehicles = (await ds.listVehicles()).filter((v) => v.hubId === hub.id);
    return { hub, forSale: vehicles.filter((v) => v.mode === "sale"), forRent: vehicles.filter((v) => v.mode === "rent") };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { hub: h } = loaderData;
    const path = `/hubs/${h.id}`;
    return seo({
      title: `${h.name} — hub de micromovilidad en ${h.zone}`,
      description: `${h.name} (${h.zone}, Bucaramanga): capacidad ${h.capacity} espacios, ${h.occupied} ocupados y ${h.charging} vehículos en carga. Alquiler y venta de patinetas, bicicletas y drones.`,
      path,
      jsonLd: [
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name: "Hubs", path: "/hubs" },
          { name: h.name, path },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": `${SITE.url}${path}`,
          name: h.name,
          url: `${SITE.url}${path}`,
          parentOrganization: { "@id": `${SITE.url}/#organization` },
          description: `Hub NODO Mobility en ${h.zone}: alquiler, devolución, carga y venta de vehículos urbanos.`,
          address: { "@type": "PostalAddress", addressLocality: SITE.city, addressRegion: "Santander", addressCountry: "CO", streetAddress: h.zone },
          geo: { "@type": "GeoCoordinates", latitude: h.lat, longitude: h.lng },
        },
      ],
    });
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center" data-testid="hub-not-found">
        <h1 className="text-3xl font-bold">Hub no encontrado</h1>
        <Link to="/hubs" className="mt-6 inline-block">
          <Button>Ver todos los hubs</Button>
        </Link>
      </div>
    </SiteLayout>
  ),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: HubPage,
});

function HubPage() {
  const { hub: h, forSale, forRent } = Route.useLoaderData();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Inicio
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link to="/hubs" className="hover:text-foreground">
            Hubs
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span aria-current="page" className="text-foreground">
            {h.name}
          </span>
        </nav>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{h.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {h.zone} · Coordenadas {h.lat.toFixed(4)}, {h.lng.toFixed(4)} · {h.active ? "Hub activo" : "Hub inactivo"}
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Capacidad total", `${h.capacity} espacios`],
            ["Ocupados", `${h.occupied}`],
            ["En carga", `${h.charging}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-border bg-surface p-5">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-2xl font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <Progress value={(h.occupied / h.capacity) * 100} className="mt-4" aria-label="Ocupación del hub" />

        <section aria-labelledby="alq" className="mt-12">
          <h2 id="alq" className="text-2xl font-bold">
            Disponibles para alquiler ({forRent.length})
          </h2>
          {forRent.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Sin vehículos de alquiler en este hub" />
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {forRent.map((v) => (
                <li key={v.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
                  <span className="font-medium">{v.model}</span> · {kindLabel[v.kind]} · {v.battery}% batería ·{" "}
                  {formatCOP(v.pricePerMinute ?? 0)}/min
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="ven" className="mt-12">
          <h2 id="ven" className="text-2xl font-bold">
            Disponibles para compra ({forSale.length})
          </h2>
          {forSale.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Sin vehículos en venta en este hub" />
            </div>
          ) : (
            <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {forSale.map((v) => (
                <li key={v.id} className="contents">
                  <VehicleCard vehicle={v} hubName={h.name} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
