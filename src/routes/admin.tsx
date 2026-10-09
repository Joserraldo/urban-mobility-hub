import { createFileRoute } from "@tanstack/react-router";

import { DeliveriesPanel } from "@/components/mobility/DeliveriesPanel";
import { TelemetryDashboard } from "@/components/mobility/TelemetryDashboard";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/admin")({
  head: () =>
    seo({
      title: "Panel de telemetría del operador",
      description:
        "Panel Digital Twin: indicadores de flota, gemelos digitales, simulador de alertas IoT, registro auditable y gestión de entregas a domicilio.",
      path: "/admin",
      noindex: true,
    }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <>
      <TelemetryDashboard />
      <div className="px-4 pb-10">
        <div className="mx-auto max-w-7xl">
          <DeliveriesPanel />
        </div>
      </div>
    </>
  );
}
