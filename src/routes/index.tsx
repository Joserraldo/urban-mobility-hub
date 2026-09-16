import { createFileRoute } from "@tanstack/react-router";

import { Landing } from "@/components/Landing";
import { MobilityApp } from "@/components/mobility/MobilityApp";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NODO Mobility — Micromovilidad, alquiler y venta urbana" },
      {
        name: "description",
        content:
          "Alquila patinetas, bicis eléctricas y drones por minuto o a domicilio, y compra vehículos urbanos en nuestra red de hubs conectados.",
      },
      {
        property: "og:title",
        content: "NODO Mobility — Micromovilidad, alquiler y venta urbana",
      },
      {
        property: "og:description",
        content:
          "Plataforma multimodal de micromovilidad, logística, alquiler y venta de vehículos urbanos con gemelos digitales IoT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const isMobile = useIsMobile();
  return isMobile ? <MobilityApp /> : <Landing />;
}
