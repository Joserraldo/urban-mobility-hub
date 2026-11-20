import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { DeliveriesPanel } from "@/components/mobility/DeliveriesPanel";
import { PcCameraPanel } from "@/components/mobility/PcCameraPanel";
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
  // Para sumar una pestaña (p. ej. "Cámara PC") basta agregar un elemento a este arreglo.
  return (
    <TelemetryDashboard
      extraTabs={[
        { value: "entregas", label: "Entregas", content: <DeliveriesPanel /> },
        { value: "camara", label: "Cámara PC", content: <PcCameraPanel /> },
        { value: "qr", label: "Hoja de QR", content: <QrLink /> },
      ]}
    />
  );
}

function QrLink() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Hoja imprimible con el QR, el código y la ubicación de cada vehículo.
      </p>
      <Button asChild data-testid="admin-qr-link">
        <Link to="/admin/qr">Abrir hoja de QR</Link>
      </Button>
    </div>
  );
}
