import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { GUIDES } from "@/content/guides";
import { SITE, breadcrumbLd, seo } from "@/lib/site";

export const Route = createFileRoute("/guias/$slug")({
  loader: ({ params }) => {
    const guide = GUIDES.find((g) => g.slug === params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const g = loaderData.guide;
    const path = `/guias/${g.slug}`;
    return seo({
      title: g.title,
      description: g.summary,
      path,
      type: "article",
      jsonLd: [
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name: "Guías", path: "/guias" },
          { name: g.title, path },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.summary,
          datePublished: g.published,
          dateModified: g.published,
          inLanguage: "es-CO",
          mainEntityOfPage: `${SITE.url}${path}`,
          image: `${SITE.url}${SITE.image}`,
          author: { "@type": "Organization", name: SITE.name },
          publisher: { "@id": `${SITE.url}/#organization` },
        },
      ],
    });
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Guía no encontrada</h1>
        <Link to="/guias" className="mt-6 inline-block">
          <Button>Ver todas las guías</Button>
        </Link>
      </div>
    </SiteLayout>
  ),
  component: GuidePage,
});

function GuidePage() {
  const { guide: g } = Route.useLoaderData();
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm text-muted-foreground">
          <Link to="/guias" className="hover:text-foreground">
            Guías
          </Link>{" "}
          · <time dateTime={g.published}>{new Date(g.published).toLocaleDateString("es-CO", { dateStyle: "long" })}</time> · {g.readingMinutes}{" "}
          min de lectura
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{g.title}</h1>
        <p className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-5 text-lg">{g.summary}</p>
        {g.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="text-2xl font-semibold">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="mt-3 text-muted-foreground">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/app">
            <Button>Probar la app</Button>
          </Link>
          <Link to="/faq">
            <Button variant="secondary">Preguntas frecuentes</Button>
          </Link>
        </div>
      </article>
    </SiteLayout>
  );
}
