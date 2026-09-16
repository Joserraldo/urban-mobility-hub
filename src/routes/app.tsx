import { createFileRoute } from "@tanstack/react-router";

import { MobilityApp } from "@/components/mobility/MobilityApp";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Web App — NODO Mobility" },
      {
        name: "description",
        content:
          "Mapa interactivo para alquilar patinetas, bicis y drones o comprar vehículos urbanos en los hubs NODO.",
      },
      { property: "og:title", content: "Web App — NODO Mobility" },
      {
        property: "og:description",
        content:
          "Alterna entre alquilar y comprar, explora hubs y desbloquea vehículos con verificación de casco por IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MobilityApp,
});
