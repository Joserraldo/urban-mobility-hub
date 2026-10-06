import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, MapPin, ShoppingCart } from "lucide-react";

import { VehicleIcon } from "@/components/common/vehicle-icon";
import { RouteError, RoutePending } from "@/components/common/route-states";
import { BuyDialog } from "@/components/commerce/CommerceDialogs";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDataSource } from "@/lib/data";
import { formatCOP, kindLabel, vehicleIdFromSlug, vehicleSlug } from "@/lib/format";
import { SITE, breadcrumbLd, seo } from "@/lib/site";

export const Route = createFileRoute("/catalogo/$slug")({
  loader: async ({ params }) => {
    const ds = getDataSource();
    const vehicle = await ds.getVehicle(vehicleIdFromSlug(params.slug));
    if (!vehicle || vehicle.mode !== "sale") throw notFound();
    const hub = vehicle.hubId ? await ds.getHub(vehicle.hubId) : null;
    return { vehicle, hub };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { vehicle: v, hub } = loaderData;
    const path = `/catalogo/${vehicleSlug(v)}`;
    return seo({
      title: `${v.model} — ${kindLabel[v.kind]} ${v.condition} por ${formatCOP(v.price ?? 0)}`,
      description: `${v.model}: ${kindLabel[v.kind].toLowerCase()} ${v.condition}. ${v.spec}. Precio ${formatCOP(v.price ?? 0)}. Recogida en ${hub?.name ?? "hub NODO"}, Bucaramanga.`,
      path,
      jsonLd: [
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name: "Catálogo", path: "/catalogo" },
          { name: v.model, path },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: v.model,
          sku: v.id,
          category: kindLabel[v.kind],
          description: `${kindLabel[v.kind]} ${v.condition}. ${v.spec}.`,
          image: `${SITE.url}${SITE.image}`,
          brand: { "@type": "Brand", name: SITE.name },
          offers: {
            "@type": "Offer",
            url: `${SITE.url}${path}`,
            priceCurrency: "COP",
            price: v.price ?? 0,
            availability: "https://schema.org/InStock",
            itemCondition:
              v.condition === "nuevo"
                ? "https://schema.org/NewCondition"
                : "https://schema.org/UsedCondition",
            seller: { "@type": "Organization", name: SITE.name },
          },
        },
      ],
    });
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center" data-testid="vehicle-not-found">
        <h1 className="text-3xl font-bold">Vehículo no disponible</h1>
        <p className="mt-3 text-muted-foreground">
          Es posible que ya se haya vendido o que el enlace sea incorrecto.
        </p>
        <Link to="/catalogo" className="mt-6 inline-block">
          <Button>Ver el catálogo</Button>
        </Link>
      </div>
    </SiteLayout>
  ),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: VehiclePage,
});

function VehiclePage() {
  const { vehicle: v, hub } = Route.useLoaderData();
  const path = `/catalogo/${vehicleSlug(v)}`;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <nav
          aria-label="Ruta de navegación"
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <Link to="/" className="hover:text-foreground">
            Inicio
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link to="/catalogo" className="hover:text-foreground">
            Catálogo
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span aria-current="page" className="text-foreground">
            {v.model}
          </span>
        </nav>

        <article
          data-testid="vehicle-detail"
          className="mt-8 grid gap-8 md:grid-cols-[auto_minmax(0,1fr)]"
        >
          <span className="flex size-32 items-center justify-center rounded-3xl bg-primary/20 md:size-48">
            <VehicleIcon kind={v.kind} className="size-16 text-primary-glow md:size-24" />
          </span>
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary-glow">
                {kindLabel[v.kind]}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{v.model}</h1>
            </div>
            <p className="text-3xl font-bold text-primary-glow">{formatCOP(v.price ?? 0)}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {v.condition}
              </Badge>
              <Badge variant="secondary">Referencia {v.id}</Badge>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Especificación técnica
                </dt>
                <dd className="mt-1 font-medium">{v.spec}</dd>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Disponible en
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 font-medium">
                  <MapPin className="size-4 text-primary-glow" aria-hidden />
                  {hub ? (
                    <Link to="/hubs/$hubId" params={{ hubId: hub.id }} className="hover:underline">
                      {hub.name} — {hub.zone}
                    </Link>
                  ) : (
                    "Hub por asignar"
                  )}
                </dd>
              </div>
            </dl>
            <BuyDialog
              vehicle={v}
              hubName={hub?.name}
              redirectTo={path}
              trigger={
                <Button size="lg" data-testid={`btn-buy-${v.id}`}>
                  <ShoppingCart className="mr-2 size-4" aria-hidden />
                  Comprar
                </Button>
              }
            />
          </div>
        </article>
      </div>
    </SiteLayout>
  );
}
