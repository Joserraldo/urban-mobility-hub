import { createFileRoute } from "@tanstack/react-router";

import { CourierApp } from "@/components/mobility/CourierApp";
import { SiteLayout } from "@/components/site/SiteLayout";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/entregas")({
  head: () =>
    seo({
      title: "Bandeja del domiciliario",
      description: "Vista interna de reparto: entregas asignadas, inicio y confirmación.",
      path: "/entregas",
      noindex: true,
    }),
  component: CourierPage,
});

function CourierPage() {
  return (
    <SiteLayout>
      <CourierApp />
    </SiteLayout>
  );
}
