import { createFileRoute } from "@tanstack/react-router";

import { TelemetryDashboard } from "@/components/mobility/TelemetryDashboard";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/admin")({
  head: () =>
    seo({
      title: "Panel de telemetría del operador",
      description: "Panel Digital Twin: indicadores de flota, gemelos digitales, simulador de alertas IoT y registro auditable.",
      path: "/admin",
      noindex: true,
    }),
  component: TelemetryDashboard,
});
