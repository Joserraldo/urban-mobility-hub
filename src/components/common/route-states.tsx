import { useRouter } from "@tanstack/react-router";

import { ErrorState, LoadingState } from "@/components/common/states";
import { SiteLayout } from "@/components/site/SiteLayout";

export function RoutePending() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <LoadingState rows={4} label="Cargando página…" testId="route-loading" />
      </div>
    </SiteLayout>
  );
}

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState
          testId="route-error"
          message={error.message || "Algo salió mal al cargar esta página."}
          onRetry={() => {
            void router.invalidate();
            reset();
          }}
        />
      </div>
    </SiteLayout>
  );
}
