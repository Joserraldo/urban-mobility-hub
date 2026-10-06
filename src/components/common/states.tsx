import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Estado de carga: esqueletos con rol de estado para lectores de pantalla. */
export function LoadingState({
  rows = 3,
  label = "Cargando…",
  testId = "state-loading",
}: {
  rows?: number;
  label?: string;
  testId?: string;
}) {
  return (
    <div role="status" aria-live="polite" data-testid={testId} className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function InlineSpinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function ErrorState({
  message = "No pudimos cargar la información.",
  onRetry,
  testId = "state-error",
}: {
  message?: string;
  onRetry?: () => void;
  testId?: string;
}) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center"
    >
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} data-testid="state-retry">
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  testId = "state-empty",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center"
    >
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
