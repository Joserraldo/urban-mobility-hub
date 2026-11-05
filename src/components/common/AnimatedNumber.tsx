import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Número que se desliza desde el valor anterior al nuevo cuando cambia (indicadores en vivo).
 * Con movimiento reducido muestra el valor final directamente.
 */
export function AnimatedNumber({
  value,
  suffix = "",
  testId,
}: {
  value: number;
  suffix?: string;
  testId?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce || prev.current === value) {
      prev.current = value;
      setShown(value);
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span className="tabular-nums" data-testid={testId}>
      {shown}
      {suffix}
    </span>
  );
}
