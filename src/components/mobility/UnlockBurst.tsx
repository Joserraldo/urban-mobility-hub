import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { playSound } from "@/lib/sound";

// Momento de "vehículo desbloqueado": el candado se abre, salen dos ondas y chispas,
// y suena el acorde de éxito. Es el único momento coreografiado del flujo.

const EASE = [0.16, 1, 0.3, 1] as const;
const SPARKS = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);

export function UnlockBurst({ label = "Vehículo desbloqueado" }: { label?: string }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    playSound("success");
  }, []);

  return (
    <div className="relative mx-auto size-40" role="img" aria-label={label}>
      {!reduce &&
        [0, 0.18].map((d) => (
          <motion.span
            key={d}
            aria-hidden
            className="absolute inset-6 rounded-full border-2 border-success"
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.25 + d }}
          />
        ))}
      {!reduce &&
        SPARKS.map((a, i) => (
          <motion.span
            key={i}
            aria-hidden
            className={`absolute left-1/2 top-1/2 size-2 rounded-full ${i % 2 ? "bg-primary-glow" : "bg-success"}`}
            initial={{ x: "-50%", y: "-50%", scale: 0, opacity: 1 }}
            animate={{
              x: `calc(-50% + ${Math.cos(a) * 74}px)`,
              y: `calc(-50% + ${Math.sin(a) * 74}px)`,
              scale: [0, 1.2, 0],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          />
        ))}
      <motion.div
        className="absolute inset-6 flex items-center justify-center rounded-full bg-success/15 ring-2 ring-success/60"
        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <svg viewBox="0 -6 48 54" className="size-16 overflow-visible text-success" aria-hidden>
          {/* Arco del candado: gira sobre su pata derecha y sube, como un candado que se abre */}
          <motion.path
            d="M15 22v-6a9 9 0 0 1 18 0v6"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            style={{ transformBox: "view-box", transformOrigin: "33px 22px" }}
            initial={reduce ? false : { y: 0, rotate: 0 }}
            animate={{ y: -5, rotate: 24 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.2 }}
          />
          <rect x="10" y="22" width="28" height="20" rx="5" fill="currentColor" />
          <motion.circle
            cx="24"
            cy="32"
            r="3"
            className="fill-background"
            initial={reduce ? false : { scale: 1 }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.4, delay: 0.25 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
