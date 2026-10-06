import { createFileRoute } from "@tanstack/react-router";

import { MobilityApp } from "@/components/mobility/MobilityApp";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/app")({
  head: () =>
    seo({
      title: "Aplicación de mapa: alquila o compra vehículos urbanos",
      description:
        "Mapa interactivo para alquilar patinetas, bicicletas eléctricas y drones o comprar vehículos urbanos en los hubs NODO, con desbloqueo por QR y verificación de casco.",
      path: "/app",
      noindex: true,
    }),
  component: MobilityApp,
});
