import { createFileRoute, Link } from "@tanstack/react-router";

import { VehicleCard } from "@/components/catalog/VehicleCard";
import { RouteError, RoutePending } from "@/components/common/route-states";
import { EmptyState } from "@/components/common/states";
import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { getDataSource } from "@/lib/data";
import type { VehicleKind } from "@/lib/data/types";
import { formatCOP, kindPlural, vehicleSlug } from "@/lib/format";
import { SITE, breadcrumbLd, seo } from "@/lib/site";

const kinds: VehicleKind[] = ["scooter", "bike", "drone"];

export const Route = createFileRoute("/catalogo/")({
  validateSearch: (s: Record<string, unknown>): { tipo?: VehicleKind } =>
    kinds.includes(s["tipo"] as VehicleKind) ? { tipo: s["tipo"] as VehicleKind } : {},
  loader: async () => {
    const ds = getDataSource();
    const [vehicles, hubs] = await Promise.all([ds.listVehicles({ mode: "sale" }), ds.listHubs()]);
    return { vehicles, hubs };
  },
  head: ({ loaderData }) =>
    seo({
      title: "Catálogo de venta: patinetas, bicicletas eléctricas y drones",
      description:
        "Compra patinetas eléctricas, bicicletas eléctricas y drones de carga nuevos y seminuevos en Bucaramanga. Precios en pesos colombianos, ficha técnica y hub de recogida.",
      path: "/catalogo",
      jsonLd: [
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name: "Catálogo", path: "/catalogo" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Catálogo de venta NODO Mobility",
          itemListElement: (loaderData?.vehicles ?? []).map((v, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE.url}/catalogo/${vehicleSlug(v)}`,
            name: `${v.model} (${formatCOP(v.price ?? 0)})`,
          })),
        },
      ],
    }),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: CatalogPage,
});

function CatalogPage() {
  const { vehicles, hubs } = Route.useLoaderData();
  const { tipo } = Route.useSearch();
  const shown = tipo ? vehicles.filter((v) => v.kind === tipo) : vehicles;

  return (
    <SiteLayout>
      <PageHeading
        eyebrow="Venta"
        title="Catálogo de vehículos urbanos"
        lead="Patinetas eléctricas, bicicletas eléctricas y drones de carga, nuevos y seminuevos. Cada ficha indica precio, condición, especificación técnica y el hub donde puedes recogerlo."
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <nav aria-label="Filtrar por tipo" className="mb-6 flex flex-wrap gap-2">
          <Link
            to="/catalogo"
            search={{}}
            aria-current={!tipo ? "page" : undefined}
            data-testid="filter-all"
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${!tipo ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
          >
            Todos ({vehicles.length})
          </Link>
          {kinds.map((k) => (
            <Link
              key={k}
              to="/catalogo"
              search={{ tipo: k }}
              aria-current={tipo === k ? "page" : undefined}
              data-testid={`filter-${k}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${tipo === k ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
            >
              {kindPlural[k]}
            </Link>
          ))}
        </nav>
        {vehicles.length === 0 ? (
          <EmptyState
            title="Todavía no hay vehículos en venta"
            hint="El catálogo se actualiza a diario. Mientras tanto, explora los hubs."
            action={
              <Link to="/hubs" className="mt-2">
                <Button size="sm" variant="secondary">
                  Ver hubs
                </Button>
              </Link>
            }
          />
        ) : shown.length === 0 ? (
          <EmptyState
            title={
              tipo
                ? `No hay ${kindPlural[tipo].toLowerCase()} en venta`
                : "No hay vehículos en venta"
            }
            hint="Prueba con otra categoría."
            action={
              <Link to="/catalogo" className="mt-2">
                <Button size="sm" variant="secondary">
                  Ver todos
                </Button>
              </Link>
            }
          />
        ) : (
          <ul data-testid="catalog-list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((v) => (
              <li key={v.id} className="contents">
                <VehicleCard vehicle={v} hubName={hubs.find((h) => h.id === v.hubId)?.name} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
