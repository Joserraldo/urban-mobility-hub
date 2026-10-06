import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeading, SiteLayout } from "@/components/site/SiteLayout";
import { GUIDES } from "@/content/guides";
import { breadcrumbLd, seo } from "@/lib/site";

export const Route = createFileRoute("/guias/")({
  head: () =>
    seo({
      title: "Guías de micromovilidad urbana",
      description:
        "Guías prácticas: cómo alquilar una patineta eléctrica, cómo funciona la verificación de casco, cuál vehículo elegir y qué es un gemelo digital.",
      path: "/guias",
      jsonLd: [
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name: "Guías", path: "/guias" },
        ]),
      ],
    }),
  component: GuidesPage,
});

function GuidesPage() {
  return (
    <SiteLayout>
      <PageHeading eyebrow="Aprende" title="Guías de micromovilidad" lead="Contenido breve y claro para usar la plataforma con seguridad." />
      <ul data-testid="guide-list" className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 md:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug} className="relative rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary/60">
            <p className="text-xs text-muted-foreground">
              <time dateTime={g.published}>{new Date(g.published).toLocaleDateString("es-CO", { dateStyle: "long" })}</time> · {g.readingMinutes} min
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              <Link to="/guias/$slug" params={{ slug: g.slug }} className="after:absolute after:inset-0 hover:text-primary-glow">
                {g.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{g.summary}</p>
          </li>
        ))}
      </ul>
    </SiteLayout>
  );
}
