import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, QrCode, ScanFace, ShieldCheck, ShieldX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  captureTemplate,
  cosineSimilarity,
  DEMO_TOOLS,
  detectHelmet,
  loadLocalFace,
  saveLocalFace,
  useCamera,
  useQrScanner,
} from "@/lib/camera";
import { getDataSource } from "@/lib/data";
import { keys, useMe } from "@/lib/data/queries";
import { DataError, type Reservation, type UnlockSession, type Vehicle } from "@/lib/data/types";
import { formatCOP, statusLabel } from "@/lib/format";

// Flujo de desbloqueo en 3 pasos (RF-09): 1) QR  2) verificación de casco  3) "Iniciar viaje".
// Alterno RF-10: reconocimiento facial en lugar del QR. Todo el estado vive en el DataSource.

const msg = (e: unknown) => (e instanceof Error ? e.message : "Error inesperado");

export function UnlockFlow({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const ds = getDataSource();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [session, setSession] = useState<UnlockSession | null>(null);
  const [initError, setInitError] = useState<{ message: string; unauthorized: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState<null | "qr" | "helmet" | "face" | "start">(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [wearing, setWearing] = useState(true);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [finished, setFinished] = useState<Reservation | null>(null);
  const [attempt, setAttempt] = useState(0);

  const step = session?.step ?? "qr";
  const camera = useCamera(
    !!session && (step === "qr" || step === "helmet") && !reservation,
    step === "helmet" ? "user" : "environment",
  );

  // Crear la sesión de desbloqueo en el backend
  useEffect(() => {
    let alive = true;
    setSession(null);
    setInitError(null);
    ds.createUnlockSession(vehicle.id)
      .then((s) => alive && setSession(s))
      .catch(
        (e) =>
          alive &&
          setInitError({
            message: msg(e),
            unauthorized: e instanceof DataError && e.code === "unauthorized",
          }),
      );
    return () => {
      alive = false;
    };
  }, [ds, vehicle.id, attempt]);

  const run = useCallback(
    async (kind: "qr" | "helmet" | "face" | "start", fn: () => Promise<void>) => {
      setBusy(kind);
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(msg(e));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const scan = (code: string) =>
    session &&
    step === "qr" &&
    busy === null &&
    void run("qr", async () => setSession(await ds.scanQr(session.id, code)));

  const qrNative = useQrScanner(camera.videoRef, step === "qr" && camera.status === "on", (c) =>
    scan(c),
  );

  const verifyHelmet = () =>
    session &&
    void run("helmet", async () => {
      const result = await detectHelmet({ simulatedWearing: wearing });
      setSession(await ds.verifyHelmet(session.id, result));
    });

  const useFace = () =>
    session &&
    void run("face", async () => {
      let score = 0;
      const video = camera.videoRef.current;
      const reference = loadLocalFace();
      const template = video ? captureTemplate(video) : null;
      if (template && reference) score = cosineSimilarity(template, reference);
      else if (DEMO_TOOLS && me?.faceEnrolled) score = 0.95; // sin cámara: modo demostración
      setSession(await ds.verifyFace(session.id, { score }));
    });

  const enrollFace = () =>
    void run("face", async () => {
      const video = camera.videoRef.current;
      const template =
        (video && captureTemplate(video)) || Array.from({ length: 256 }, (_, i) => Math.sin(i));
      saveLocalFace(template);
      await ds.enrollFace(template);
      await qc.invalidateQueries({ queryKey: keys.me });
      toast.success("Rostro registrado en este dispositivo");
    });

  const start = () =>
    session &&
    void run("start", async () => {
      const r = await ds.startTrip(session.id);
      setReservation(r);
      void qc.invalidateQueries({ queryKey: keys.reservations });
      toast.success(`Viaje iniciado con ${vehicle.id}`, {
        description: "La tarifa por minuto está activa. Buen viaje.",
      });
    });

  const finish = () =>
    reservation &&
    void run("start", async () => {
      const r = await ds.transitionReservation(reservation.id, "finish");
      setFinished(r);
      void qc.invalidateQueries({ queryKey: keys.reservations });
    });

  // Cierre con Escape
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showCamera = !reservation && (step === "qr" || step === "helmet") && camera.status === "on";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Desbloqueo seguro"
      data-testid="unlock-flow"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background/95 backdrop-blur-sm"
    >
      <header className="flex items-center justify-between px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Desbloqueo seguro
          </p>
          <p className="truncate text-base font-semibold">
            {vehicle.model} · {vehicle.id}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar"
          data-testid="unlock-btn-close"
        >
          <X className="size-5" />
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
        {initError ? (
          <div className="w-full max-w-sm space-y-4">
            <ErrorState
              testId="unlock-error"
              message={initError.message}
              onRetry={initError.unauthorized ? undefined : () => setAttempt((a) => a + 1)}
            />
            {initError.unauthorized && (
              <div className="flex gap-2">
                <Link to="/login" search={{ redirect: "/app" }} className="flex-1">
                  <Button className="w-full" data-testid="unlock-login">
                    Ingresar
                  </Button>
                </Link>
                <Link to="/registro" search={{ redirect: "/app" }} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Crear cuenta
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : !session ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="unlock-loading"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden /> Preparando desbloqueo…
          </p>
        ) : reservation ? (
          <div className="w-full max-w-sm space-y-5 text-center" data-testid="unlock-trip">
            <CheckCircle2 className="mx-auto size-16 text-success" aria-hidden />
            <p>
              Reserva:{" "}
              <strong data-testid="reservation-status">
                {statusLabel[(finished ?? reservation).status]}
              </strong>
            </p>
            {finished ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Viaje finalizado. Total a pagar:{" "}
                  <strong className="text-foreground">{formatCOP(finished.totalCost ?? 0)}</strong>
                </p>
                <Button className="w-full" onClick={onClose}>
                  Cerrar
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Viaje en curso con {vehicle.id}. Devuélvelo en un hub y finaliza aquí.
                </p>
                <Button
                  className="w-full"
                  onClick={finish}
                  disabled={busy === "start"}
                  data-testid="trip-finish"
                >
                  Finalizar viaje
                </Button>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {step === "qr" ? (
              <motion.div
                key="qr"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                data-testid="unlock-step-qr"
                className="w-full max-w-sm space-y-5 text-center"
              >
                <CameraBox
                  show={showCamera}
                  videoRef={camera.videoRef}
                  icon={<QrCode className="size-24 text-primary-glow/70" aria-hidden />}
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
                    Paso 1 de 3
                  </p>
                  <h2 className="text-lg font-semibold">Escanea el código QR</h2>
                  <p className="text-sm text-muted-foreground">
                    {camera.status === "denied"
                      ? "No pudimos abrir la cámara. Escribe el código impreso en el manubrio."
                      : qrNative
                        ? "Apunta la cámara al código impreso en el manubrio."
                        : "Escribe el código impreso en el manubrio (tu navegador no lee QR con la cámara)."}
                  </p>
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    scan(manualCode);
                  }}
                >
                  <Input
                    aria-label="Código del vehículo"
                    placeholder={`UMH:${vehicle.id}`}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    data-testid="unlock-input-code"
                  />
                  <Button type="submit" variant="secondary" disabled={!manualCode || busy !== null}>
                    Validar
                  </Button>
                </form>
                <div className="space-y-2">
                  {DEMO_TOOLS && (
                    <Button
                      className="w-full"
                      disabled={busy !== null}
                      onClick={() => scan(`UMH:${vehicle.id}`)}
                      data-testid="unlock-btn-scan"
                    >
                      {busy === "qr" && (
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      )}
                      Simular escaneo del QR
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={busy !== null || !me}
                    onClick={useFace}
                    data-testid="unlock-btn-face"
                  >
                    <ScanFace className="mr-2 size-4" aria-hidden />
                    Usar reconocimiento facial
                  </Button>
                  {me && !me.faceEnrolled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      disabled={busy !== null}
                      onClick={enrollFace}
                      data-testid="unlock-btn-enroll-face"
                    >
                      Registrar mi rostro (opcional)
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : step === "denied" || step === "expired" ? (
              <motion.div
                key="denied"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="unlock-step-denied"
                className="w-full max-w-sm space-y-5 text-center"
              >
                <ShieldX className="mx-auto size-16 text-destructive" aria-hidden />
                <h2 className="text-lg font-semibold">Acceso denegado</h2>
                <p role="alert" className="text-sm text-muted-foreground">
                  {session.reason ?? "No fue posible verificar el desbloqueo."}
                </p>
                <Button
                  className="w-full"
                  onClick={() => setAttempt((a) => a + 1)}
                  data-testid="unlock-btn-retry"
                >
                  Intentar de nuevo
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="helmet"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                data-testid={step === "ready" ? "unlock-step-ready" : "unlock-step-helmet"}
                className="w-full max-w-sm space-y-5 text-center"
              >
                <CameraBox
                  show={showCamera}
                  videoRef={camera.videoRef}
                  round
                  icon={
                    <ScanFace
                      className={`size-28 ${step === "ready" ? "text-success" : "text-primary-glow/70"}`}
                      aria-hidden
                    />
                  }
                  overlay={
                    step === "ready" ? (
                      <CheckCircle2 className="size-12 text-success" aria-hidden />
                    ) : null
                  }
                />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
                    Paso {step === "ready" ? 3 : 2} de 3
                  </p>
                  <h2 className="flex items-center justify-center gap-2 text-lg font-semibold">
                    <ShieldCheck className="size-5 text-primary-glow" aria-hidden />
                    Verificación de casco
                  </h2>
                  <p className="text-sm text-muted-foreground" role="status">
                    {step === "ready"
                      ? "Casco detectado correctamente. Puedes iniciar tu viaje."
                      : busy === "helmet"
                        ? "Verificando uso de casco…"
                        : "Colócate el casco y mira a la cámara."}
                  </p>
                </div>
                {step === "helmet" && DEMO_TOOLS && (
                  <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={wearing}
                      onChange={(e) => setWearing(e.target.checked)}
                      data-testid="unlock-sim-helmet"
                      className="accent-[var(--primary)]"
                    />
                    Modo simulación: llevo el casco puesto
                  </label>
                )}
                {step === "helmet" && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={busy !== null}
                    onClick={verifyHelmet}
                    data-testid="unlock-btn-helmet"
                  >
                    {busy === "helmet" && (
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    )}
                    Verificar casco
                  </Button>
                )}
                <Button
                  className="w-full"
                  disabled={step !== "ready" || busy !== null}
                  onClick={start}
                  data-testid="unlock-btn-start"
                >
                  {busy === "start" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                  Iniciar viaje
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {error && (
          <p
            role="alert"
            data-testid="unlock-error-msg"
            className="max-w-sm text-center text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function CameraBox({
  show,
  videoRef,
  icon,
  overlay,
  round,
}: {
  show: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  icon: React.ReactNode;
  overlay?: React.ReactNode;
  round?: boolean;
}) {
  return (
    <div
      className={`relative mx-auto aspect-square w-full overflow-hidden border border-border bg-secondary/60 ${round ? "rounded-full" : "rounded-3xl"}`}
    >
      <div className="absolute inset-0 map-grid opacity-30" aria-hidden />
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Vista de la cámara"
        className={`absolute inset-0 size-full object-cover ${show ? "" : "hidden"}`}
      />
      {!show && <div className="absolute inset-0 flex items-center justify-center">{icon}</div>}
      <div
        className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-primary/70"
        aria-hidden
      />
      {overlay && <div className="absolute inset-x-0 bottom-8 flex justify-center">{overlay}</div>}
    </div>
  );
}
