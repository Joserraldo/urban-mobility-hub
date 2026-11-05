import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

// Header de marca del mapa: el rayo de NODO se "carga" al entrar (una vez) y debajo rota
// un indicador en vivo con datos reales de la flota.

type Props = {
  live: boolean;
  /** Frases del indicador; rotan cada pocos segundos. */
  messages: { text: string; tone?: "ok" | "alert" }[];
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const EASE = [0.16, 1, 0.3, 1] as const;
const BOLT = "M13 2 4 14h7l-1 8 9-12h-7l1-8z";

export function MapHeader({ live, messages, left, right }: Props) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  // Rota solo con la pestaña visible; con movimiento reducido igual rota, pero sin desplazamiento.
  useEffect(() => {
    if (messages.length < 2) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setI((n) => n + 1);
    }, 3800);
    return () => window.clearInterval(id);
  }, [messages.length]);

  const msg = messages.length ? messages[i % messages.length] : undefined;

  return (
    <div
      className="pointer-events-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-full border border-border/80 bg-[oklch(0.17_0.03_265/88%)] p-1.5 shadow-panel backdrop-blur-md"
      data-testid="map-header"
    >
      {left}
      <div className="flex min-w-0 items-center justify-center gap-2.5">
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
            <motion.path
              d={BOLT}
              fill="white"
              stroke="white"
              strokeWidth={1.5}
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 1 }}
              transition={{
                pathLength: { duration: 0.7, ease: EASE, delay: 0.15 },
                fillOpacity: { duration: 0.3, delay: 0.75 },
              }}
            />
          </svg>
        </span>
        <div className="min-w-0 text-left">
          <h1 className="truncate text-sm leading-tight tracking-tight">
            <span className="font-bold">NODO</span>{" "}
            <span className="font-normal text-muted-foreground">Mobility</span>
          </h1>
          <div className="flex h-4 items-center gap-1.5 overflow-hidden" aria-live="polite">
            <span className="relative flex size-1.5 shrink-0" aria-hidden>
              {live && !reduce && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
              )}
              <span
                className={`relative inline-flex size-1.5 rounded-full ${live ? "bg-success" : "bg-muted-foreground"}`}
              />
            </span>
            <span
              className="relative block min-w-0 flex-1 text-[11px] leading-4"
              data-testid="live-indicator"
              data-live={live}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${i % Math.max(1, messages.length)}-${msg?.text ?? ""}`}
                  className={`block truncate ${msg?.tone === "alert" ? "text-destructive" : "text-muted-foreground"}`}
                  initial={reduce ? { opacity: 0 } : { y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { y: -12, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {live ? (msg?.text ?? "en vivo") : "sin conexión en vivo"}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </div>
      </div>
      {right}
    </div>
  );
}
