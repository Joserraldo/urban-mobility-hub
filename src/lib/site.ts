// Constantes del sitio y helpers de SEO / GEO / AEO (decisión D6).

export const SITE = {
  name: "NODO Mobility",
  legalName: "NODO Mobility — Plataforma Multimodal de Micromovilidad",
  url:
    (import.meta.env["VITE_SITE_URL"] as string | undefined)?.replace(/\/$/, "") ??
    "https://urban-mobility-hub.pages.dev",
  locale: "es_CO",
  description:
    "Alquila por minuto o compra patinetas eléctricas, bicicletas eléctricas y drones de carga en Bucaramanga. Red de hubs conectados con verificación de casco y alertas de seguridad IoT.",
  city: "Bucaramanga",
  image: "/og-image.jpg",
};

type JsonLd = Record<string, unknown>;

export type SeoInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  noindex?: boolean;
  image?: string;
  jsonLd?: JsonLd[];
};

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path}`);

/** Devuelve el objeto `head` de TanStack Router con meta, canonical, hreflang, OG, Twitter y JSON-LD. */
export function seo({
  title,
  description,
  path,
  type = "website",
  noindex,
  image = SITE.image,
  jsonLd = [],
}: SeoInput) {
  const fullTitle = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;
  const url = abs(path);
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      {
        name: "robots",
        content: noindex
          ? "noindex, nofollow"
          : "index, follow, max-image-preview:large, max-snippet:-1",
      },
      { property: "og:site_name", content: SITE.name },
      { property: "og:locale", content: SITE.locale },
      { property: "og:type", content: type },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: abs(image) },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: abs(image) },
    ],
    links: [
      { rel: "canonical", href: url },
      { rel: "alternate", hrefLang: "es-CO", href: url },
      { rel: "alternate", hrefLang: "x-default", href: url },
    ],
    scripts: jsonLd.map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify(data),
    })),
  };
}

export const organizationLd = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url,
  logo: `${SITE.url}/icon-512.png`,
  description: SITE.description,
  areaServed: { "@type": "City", name: SITE.city },
  sameAs: ["https://github.com/Joserraldo/urban-mobility-hub"],
});

export const websiteLd = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  inLanguage: "es-CO",
  publisher: { "@id": `${SITE.url}/#organization` },
});

export const breadcrumbLd = (items: { name: string; path: string }[]): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: abs(it.path),
  })),
});

export const faqLd = (items: { q: string; a: string }[]): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((it) => ({
    "@type": "Question",
    name: it.q,
    acceptedAnswer: { "@type": "Answer", text: it.a },
  })),
});
