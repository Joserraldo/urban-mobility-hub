import { createFileRoute } from "@tanstack/react-router";

import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import { FAQ } from "@/content/faq";
import { breadcrumbLd, faqLd, seo } from "@/lib/site";

export const Route = createFileRoute("/faq")({
  head: () =>
    seo({
      title:
        "Preguntas frecuentes sobre alquiler y compra de patinetas, bicicletas eléctricas y drones",
      description:
        "Respuestas directas: cuánto cuesta alquilar, cómo se desbloquea un vehículo, qué pasa sin casco, qué alertas se monitorean y cómo se protegen tus datos biométricos.",
      path: "/faq",
      jsonLd: [
        faqLd(FAQ),
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name: "Preguntas frecuentes", path: "/faq" },
        ]),
      ],
    }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <SiteLayout>
      <PageHeading
        eyebrow="Ayuda"
        title="Preguntas frecuentes"
        lead="Respuestas cortas y directas sobre cómo funciona NODO Mobility."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 sm:px-6" data-testid="faq-list">
        {FAQ.map((f, i) => (
          <section
            key={f.q}
            aria-labelledby={`faq-${i}`}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <h2 id={`faq-${i}`} className="text-lg font-semibold">
              {f.q}
            </h2>
            <p className="mt-2 text-muted-foreground">{f.a}</p>
          </section>
        ))}
      </div>
    </SiteLayout>
  );
}
