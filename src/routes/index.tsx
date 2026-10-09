import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Landing, type Tarifas } from "@/components/Landing";
import { RouteError, RoutePending } from "@/components/common/route-states";
import { getDataSource } from "@/lib/data";
import type { Vehicle, VehicleKind } from "@/lib/data/types";
import { SITE, organizationLd, productsLd, seo, servicesLd, websiteLd } from "@/lib/site";

export const Route = createFileRoute("/")({
  loader: async () => {
    const ds = getDataSource();
    const [hubs, allSale] = await Promise.all([ds.listHubs(), ds.listVehicles({ mode: "sale" })]);
    const rentals = await ds.listVehicles({ mode: "rent" });
    const forSale = allSale.filter((v) => !v.status || v.status === "available");
    return {
      hubs,
      featured: forSale.slice(0, 4),
      vehicleCount: forSale.length + rentals.length,
      tarifas: tarifasOf(forSale, rentals),
    };
  },
  head: ({ loaderData }) =>
    seo({
      title:
        "NODO Mobility — Alquiler y venta de patinetas, bicicletas eléctricas y drones en Bucaramanga",
      description: SITE.description,
      path: "/",
      jsonLd: [
        organizationLd(),
        websiteLd(),
        ...(loaderData
          ? [
              servicesLd(loaderData.tarifas.kinds, loaderData.tarifas.deliveryReady),
              productsLd(loaderData.featured as unknown as Parameters<typeof productsLd>[0]),
            ]
          : []),
      ],
    }),
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  component: Index,
});

/** Tarifas honestas leídas de la flota real (sin inventar promos): rangos COP/min por tipo. */
function tarifasOf(forSale: Vehicle[], rentals: Vehicle[]): Tarifas {
  const kinds = (["scooter", "bike", "drone"] as VehicleKind[])
    .map((kind) => {
      const rates = rentals
        .filter((v) => v.kind === kind && typeof v.pricePerMinute === "number")
        .map((v) => v.pricePerMinute as number)
        .sort((a, b) => a - b);
      return rates.length ? { kind, from: rates[0], to: rates[rates.length - 1] } : null;
    })
    .filter((k): k is Tarifas["kinds"][number] => k !== null);
  const prices = forSale
    .map((v) => v.price)
    .filter((p): p is number => typeof p === "number")
    .sort((a, b) => a - b);
  return {
    kinds,
    deliveryReady: rentals.filter((v) => v.delivery).length,
    saleFrom: prices[0] ?? null,
    saleTo: prices.length ? (prices[prices.length - 1] ?? null) : null,
  };
}

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
