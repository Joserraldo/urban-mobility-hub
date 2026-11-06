import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/LegalPage";
import { REPO_ISSUES } from "@/content/legal";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/contacto")({
  head: () =>
    seo({
      title: "Contacto del equipo NODO Mobility",
      description:
        "Cómo escribirnos para soporte, quejas o solicitudes sobre tus datos personales.",
      path: "/contacto",
    }),
  component: () => (
    <LegalPage title="Contacto" lead="Somos un equipo de tres estudiantes de la UNAB, Bucaramanga.">
      <p className="text-muted-foreground">
        Para soporte, quejas o solicitudes sobre tus datos (consulta, corrección, supresión o
        revocar tu autorización), escríbenos abriendo una solicitud en{" "}
        <a className="underline" href={REPO_ISSUES} rel="noopener noreferrer" target="_blank">
          nuestro repositorio del proyecto
        </a>
        ({REPO_ISSUES}). Necesitas una cuenta gratuita de GitHub. No incluyas contraseñas ni datos
        sensibles en el mensaje.
      </p>
    </LegalPage>
  ),
});
