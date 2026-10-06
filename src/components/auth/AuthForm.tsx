import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthActions } from "@/lib/data/queries";

const safeRedirect = (r: string | undefined) =>
  r && r.startsWith("/") && !r.startsWith("//") ? r : "/app";

/** Login y registro (RNF-05, RD11). El registro exige consentimiento expreso Ley 1581 de 2012. */
export function AuthForm({
  mode,
  redirect,
}: {
  mode: "login" | "register";
  redirect?: string | undefined;
}) {
  const navigate = useNavigate();
  const { login, register } = useAuthActions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";
  const pending = login.isPending || register.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isRegister && password.length < 8)
      return setError("La contraseña debe tener al menos 8 caracteres.");
    if (isRegister && !consent)
      return setError("Debes aceptar el tratamiento de datos personales para registrarte.");
    try {
      if (isRegister) await register.mutateAsync({ name, email, password, consent });
      else await login.mutateAsync({ email, password });
      await navigate({ to: safeRedirect(redirect) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar la solicitud.");
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5"
      data-testid={isRegister ? "register-form" : "login-form"}
    >
      {isRegister && (
        <div className="space-y-1.5">
          <Label htmlFor="auth-name">Nombre completo</Label>
          <Input
            id="auth-name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="auth-name"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="auth-email">Correo electrónico</Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="auth-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="auth-password">Contraseña</Label>
        <Input
          id="auth-password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="auth-password"
        />
        {isRegister && (
          <p className="text-xs text-muted-foreground">
            Mínimo 8 caracteres. Se almacena cifrada, nunca en texto plano.
          </p>
        )}
      </div>

      {isRegister && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-elevated p-4">
          <Checkbox
            id="auth-consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            data-testid="auth-consent"
            className="mt-0.5"
          />
          <Label htmlFor="auth-consent" className="text-sm font-normal leading-relaxed">
            Autorizo de forma expresa e informada el tratamiento de mis datos personales y, si
            decido activarlo, de mi plantilla facial (dato biométrico) para el desbloqueo de
            vehículos, conforme a la Ley 1581 de 2012. La plantilla se guarda cifrada y puedo
            revocar esta autorización en cualquier momento.
          </Label>
        </div>
      )}

      {error && (
        <p
          role="alert"
          data-testid="auth-error"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending} data-testid="auth-submit">
        {pending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
        {isRegister ? "Crear cuenta" : "Ingresar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link
              to="/login"
              search={redirect ? { redirect } : {}}
              className="text-primary-glow hover:underline"
              data-testid="auth-switch"
            >
              Ingresa
            </Link>
          </>
        ) : (
          <>
            ¿Eres nuevo?{" "}
            <Link
              to="/registro"
              search={redirect ? { redirect } : {}}
              className="text-primary-glow hover:underline"
              data-testid="auth-switch"
            >
              Crea tu cuenta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
