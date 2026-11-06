import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/LegalPage";
import { TERMINOS } from "@/content/legal";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/terminos")({
  head: () =>
    seo({
      title: "Términos y condiciones de NODO Mobility",
      description: "Reglas de uso, prepago, cancelaciones y alcance de la fase de simulación.",
      path: "/terminos",
    }),
  component: () => (
    <LegalPage
      title="Términos y condiciones"
      lead="Reglas simples de uso. NODO Mobility es un proyecto académico en fase de simulación."
      sections={TERMINOS}
    />
  ),
});
