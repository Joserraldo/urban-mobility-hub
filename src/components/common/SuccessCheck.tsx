import { motion, useReducedMotion } from "framer-motion";

/** Check de confirmación que se dibuja (círculo y luego la palomita) al aprobar un pago o reserva. */
export function SuccessCheck({ className = "mx-auto size-12" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;
  return (
    <svg viewBox="0 0 48 48" className={`${className} text-success`} aria-hidden>
      <motion.circle
        cx="24"
        cy="24"
        r="21"
        fill="currentColor"
        fillOpacity={0.12}
        stroke="currentColor"
        strokeWidth={2.5}
        initial={reduce ? false : { pathLength: 0, scale: 0.8 }}
        animate={{ pathLength: 1, scale: 1 }}
        style={{ originX: "24px", originY: "24px" }}
        transition={{ duration: 0.5, ease }}
      />
      <motion.path
        d="M15 24.5 21.5 31 33.5 18"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease, delay: 0.35 }}
      />
    </svg>
  );
}
