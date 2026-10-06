import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth/AuthForm";
import { SiteLayout } from "@/components/site/SiteLayout";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/registro")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {},
  head: () =>
    seo({
      title: "Crear cuenta",
      description:
        "Crea tu cuenta NODO Mobility con consentimiento de tratamiento de datos (Ley 1581 de 2012).",
      path: "/registro",
      noindex: true,
    }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect } = Route.useSearch();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Crear cuenta</h1>
        <p className="mb-8 mt-2 text-muted-foreground">Es gratis y toma menos de un minuto.</p>
        <AuthForm mode="register" redirect={redirect} />
      </div>
    </SiteLayout>
  );
}
