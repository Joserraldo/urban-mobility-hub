import { createFileRoute } from "@tanstack/react-router";

import { TelemetryDashboard } from "@/components/mobility/TelemetryDashboard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel de telemetría IoT — NODO Mobility" },
      {
        name: "description",
        content:
          "Dashboard técnico con gemelo digital de cada vehículo: batería, GPS, alertas de seguridad y simulador de eventos IoT.",
      },
      { property: "og:title", content: "Panel de telemetría IoT — NODO Mobility" },
      {
        property: "og:description",
        content:
          "Monitorea la flota conectada de patinetas, bicis y drones con alertas en vivo de casco, caídas y GPS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TelemetryDashboard,
});
