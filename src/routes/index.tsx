import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Landing } from "@/components/Landing";
import { RouteError, RoutePending } from "@/components/common/route-states";
import { getDataSource } from "@/lib/data";
import { SITE, organizationLd, seo, websiteLd } from "@/lib/site";

export const Route = createFileRoute("/")({
  loader: async () => {
    const ds = getDataSource();
    const [hubs, forSale] = await Promise.all([ds.listHubs(), ds.listVehicles({ mode: "sale" })]);
    const rentals = await ds.listVehicles({ mode: "rent" });
    return { hubs, featured: forSale.slice(0, 4), vehicleCount: forSale.length + rentals.length };
  },
  head: () =>
    seo({
      title:
        "NODO Mobility — Alquiler y venta de patinetas, bicicletas eléctricas y drones en Bucaramanga",
      description: SITE.description,
      path: "/",
      jsonLd: [organizationLd(), websiteLd()],
    }),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: Index,
});

/**
 * RF-01: en móvil se entra directo al mapa. Se resuelve en el CLIENTE (no por user-agent en el servidor, D6)
 * para no dañar el rastreo: los bots siempre ven la landing completa.
 */
function useMobileRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const ua = navigator.userAgent;
    if (
      navigator.webdriver ||
      /bot|crawl|spider|slurp|lighthouse|facebookexternalhit|preview/i.test(ua)
    )
      return;
    if (new URLSearchParams(window.location.search).has("vista")) return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      void navigate({ to: "/app", replace: true });
    }
  }, [navigate]);
}

function Index() {
  const data = Route.useLoaderData();
  useMobileRedirect();
  return <Landing {...data} />;
}
