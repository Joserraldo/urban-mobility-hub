import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth/AuthForm";
import { SiteLayout } from "@/components/site/SiteLayout";
import { seo } from "@/lib/site";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {},
  head: () => seo({ title: "Ingresar", description: "Ingresa a tu cuenta NODO Mobility para alquilar, comprar y desbloquear vehículos.", path: "/login", noindex: true }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-3xl font-bold tracking-tight">Ingresar</h1>
        <p className="mb-8 mt-2 text-muted-foreground">Accede para reservar, comprar y desbloquear vehículos.</p>
        <AuthForm mode="login" redirect={redirect} />
      </div>
    </SiteLayout>
  );
}
