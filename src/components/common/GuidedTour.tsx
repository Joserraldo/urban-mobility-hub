import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sound";

// Tutorial guiado de primer uso. Resalta controles reales de la pantalla (no un modo aparte),
// se puede saltar en cualquier paso, se recuerda en el navegador y se repite con el botón "?".

export type TourStep = {
  /** Selector del elemento a resaltar; sin selector la tarjeta va centrada (bienvenida/cierre). */
  target?: string;
  title: string;
  body: React.ReactNode;
};

type Props = {
  /** Clave para recordar que el tutorial ya se vio (localStorage). */
  storageKey: string;
  steps: TourStep[];
  /** Abre el tutorial desde fuera (botón "?"); se incrementa para reabrir. */
  openSignal?: number;
  /** Texto y acción del botón del último paso. */
  finishLabel?: string;
  onFinish?: () => void;
};

const PAD = 8;
const CARD_W = 340;

type Rect = { top: number; left: number; width: number; height: number };

function readSeen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeSeen(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* sin almacenamiento: el tutorial simplemente vuelve a salir */
  }
}

export function GuidedTour({ storageKey, steps, openSignal, finishLabel, onFinish }: Props) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Primera visita: abre solo, con una pequeña espera para que el mapa y los controles existan.
  useEffect(() => {
    // En pruebas automatizadas no se abre solo (taparía la pantalla); el botón "?" sigue funcionando.
    if (readSeen(storageKey) || navigator.webdriver) return;
    const t = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [storageKey]);

  useEffect(() => {
    if (openSignal) {
      setI(0);
      setOpen(true);
    }
  }, [openSignal]);

  const step = steps[i];

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    if (!step?.target) return setRect(null);
    const el = document.querySelector(step.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step?.target]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  // Si el elemento está fuera de la vista (p. ej. en /admin), lo trae a pantalla.
  useEffect(() => {
    if (!open || !step?.target) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    const t = window.setTimeout(measure, reduce ? 0 : 350);
    return () => window.clearTimeout(t);
  }, [open, i, step?.target, measure, reduce]);

  const close = useCallback(() => {
    writeSeen(storageKey);
    setOpen(false);
  }, [storageKey]);

  const next = useCallback(() => {
    playSound("tap");
    if (i < steps.length - 1) setI(i + 1);
    else {
      close();
      onFinish?.();
    }
  }, [i, steps.length, close, onFinish]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, back]);

  // El foco va a la tarjeta en cada paso, para lectores de pantalla y teclado.
  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, i]);

  if (!step) return null;

  // Tarjeta debajo del objetivo si cabe; si no, encima; sin objetivo, centrada.
  const cardW = Math.min(CARD_W, viewport.w - 32);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + 12;
    const fitsBelow = below + 220 < viewport.h;
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - cardW / 2),
      viewport.w - cardW - 16,
    );
    cardStyle = fitsBelow
      ? { top: below, left, width: cardW }
      : { bottom: viewport.h - rect.top + 12, left, width: cardW };
  } else {
    cardStyle = { top: "50%", left: "50%", width: cardW, transform: "translate(-50%, -50%)" };
  }

  const last = i === steps.length - 1;
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="tour"
          className="fixed inset-0 z-[2000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-testid="guided-tour"
        >
          {/* Fondo: un recorte alrededor del control resaltado. Clic fuera no cierra (evita salir sin querer). */}
          {rect ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute rounded-2xl ring-2 ring-primary-glow"
              initial={false}
              animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
              transition={reduce ? { duration: 0 } : { duration: 0.35, ease }}
              style={{ boxShadow: "0 0 0 9999px oklch(0.1 0.01 285 / 72%)" }}
            />
          ) : (
            <div aria-hidden className="absolute inset-0 bg-[oklch(0.1_0.01_285/72%)]" />
          )}

          {/* Posición en un div normal; la animación va en el hijo para no pisar el transform. */}
          <div className="absolute" style={cardStyle}>
            <motion.div
              key={i}
              ref={cardRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tour-title"
              aria-describedby="tour-body"
              tabIndex={-1}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease }}
              className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-panel outline-none"
              style={{ outline: "none" }}
              data-testid="tour-card"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-primary-glow" aria-live="polite">
                  Paso {i + 1} de {steps.length}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="-m-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary-glow"
                  aria-label="Cerrar tutorial"
                  data-testid="tour-close"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <h2 id="tour-title" className="mt-1 text-base font-semibold tracking-tight">
                {step.title}
              </h2>
              <div id="tour-body" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </div>

              <div className="mt-4 flex items-center gap-1.5" aria-hidden>
                {steps.map((_, n) => (
                  <span
                    key={n}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      n === i
                        ? "w-5 bg-primary-glow"
                        : n < i
                          ? "w-2 bg-primary/60"
                          : "w-2 bg-border"
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                {i === 0 ? (
                  <button
                    type="button"
                    onClick={close}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    data-testid="tour-skip"
                  >
                    Saltar tutorial
                  </button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={back} data-testid="tour-back">
                    <ArrowLeft className="mr-1 size-4" aria-hidden />
                    Atrás
                  </Button>
                )}
                <Button size="sm" onClick={next} data-testid="tour-next">
                  {last ? (finishLabel ?? "Terminar") : "Siguiente"}
                  {!last && <ArrowRight className="ml-1 size-4" aria-hidden />}
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
