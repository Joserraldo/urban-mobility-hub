import { useSyncExternalStore } from "react";

// Sonidos de la interfaz sintetizados con Web Audio: no hay archivos que descargar.
// Son cortos y suaves, acompañan acciones del usuario (o alertas para el operador) y se
// pueden silenciar; la preferencia se guarda en el navegador.

export type SoundName =
  | "tap" // seleccionar un vehículo o hub
  | "toggle" // cambiar de modo o abrir un panel
  | "locate" // te encontramos / vamos al más cercano
  | "step" // un paso del desbloqueo o del tutorial superado
  | "success" // desbloqueo, pago aprobado, entrega confirmada
  | "error" // algo falló o fue negado
  | "alert"; // llegó una alerta de la flota (operador)

const KEY = "umh-sound-muted";
let ctx: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Una nota con envolvente rápida (ataque corto, caída exponencial). */
function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  {
    type = "sine",
    gain = 0.08,
    slideTo,
  }: { type?: OscillatorType; gain?: number; slideTo?: number } = {},
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playSound(name: SoundName): void {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  switch (name) {
    case "tap":
      tone(ac, 880, t, 0.07, { type: "triangle", gain: 0.05 });
      break;
    case "toggle":
      tone(ac, 520, t, 0.06, { type: "triangle", gain: 0.05 });
      tone(ac, 780, t + 0.05, 0.08, { type: "triangle", gain: 0.05 });
      break;
    case "locate":
      tone(ac, 440, t, 0.35, { gain: 0.06, slideTo: 1320 });
      tone(ac, 1320, t + 0.3, 0.12, { type: "triangle", gain: 0.04 });
      break;
    case "step":
      tone(ac, 660, t, 0.1, { type: "triangle", gain: 0.06 });
      tone(ac, 990, t + 0.08, 0.14, { type: "triangle", gain: 0.06 });
      break;
    case "success":
      // Acorde ascendente (do-mi-sol-do) con un poco de brillo.
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(ac, f, t + i * 0.08, 0.35, { gain: 0.07 }),
      );
      tone(ac, 2093, t + 0.32, 0.25, { type: "triangle", gain: 0.02 });
      break;
    case "error":
      tone(ac, 330, t, 0.16, { type: "square", gain: 0.035, slideTo: 220 });
      tone(ac, 220, t + 0.14, 0.2, { type: "square", gain: 0.03 });
      break;
    case "alert":
      // Dos tonos alternos, como una sirena corta.
      [0, 0.18, 0.36].forEach((d, i) =>
        tone(ac, i % 2 ? 660 : 880, t + d, 0.16, { type: "sawtooth", gain: 0.035 }),
      );
      break;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* sin almacenamiento: dura hasta recargar */
  }
  listeners.forEach((l) => l());
  if (!value) playSound("toggle");
}

/** Estado de silencio compartido por todos los botones de sonido. */
export function useMuted(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => muted,
    () => false,
  );
}
