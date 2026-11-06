import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/LegalPage";
import { PRIVACIDAD } from "@/content/legal";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/privacidad")({
  head: () =>
    seo({
      title: "Política de privacidad y tratamiento de datos de NODO Mobility",
      description:
        "Qué datos tratamos, para qué, cómo ejercer tus derechos (Ley 1581 de 2012) y qué pasa con el dato biométrico.",
      path: "/privacidad",
    }),
  component: () => (
    <LegalPage
      title="Política de privacidad"
      lead="Qué datos tratamos, para qué y cómo ejercer tus derechos según la Ley 1581 de 2012."
      sections={PRIVACIDAD}
    />
  ),
});
