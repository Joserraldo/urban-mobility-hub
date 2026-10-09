import { useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "on" | "denied" | "unsupported";

/** Herramientas de simulación visibles (no hay vehículos ni cámaras de casco reales: SRS 2.4). */
export const DEMO_TOOLS = (import.meta.env["VITE_DEMO_TOOLS"] as string | undefined) !== "false";

/** Abre la cámara del dispositivo y devuelve el <video> donde se muestra. Se libera al desmontar. */
export function useCamera(enabled: boolean, facing: "user" | "environment" = "user") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    let stream: MediaStream | undefined;
    let cancelled = false;
    setStatus("requesting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play().catch(() => undefined);
        }
        setStatus("on");
      })
      .catch(() => !cancelled && setStatus("denied"));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, facing]);

  return { videoRef, status };
}

/** Plantilla facial simple: miniatura 16×16 en grises, normalizada (vector de 256 valores). */
export function captureTemplate(video: HTMLVideoElement): number[] | null {
  if (!video.videoWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, 16, 16);
  const { data } = ctx.getImageData(0, 0, 16, 16);
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4)
    gray.push(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  return gray.map((g) => g - mean);
}

export const cosineSimilarity = (a: number[], b: number[]) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

const FACE_KEY = "umh.face.template";
export const saveLocalFace = (t: number[]) =>
  window.localStorage.setItem(FACE_KEY, JSON.stringify(t));
export const loadLocalFace = (): number[] | null => {
  try {
    const raw = window.localStorage.getItem(FACE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : null;
  } catch {
    return null;
  }
};

type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/** Lee códigos QR de la cámara con la API nativa BarcodeDetector (si el navegador la ofrece). */
export function useQrScanner(
  video: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  onCode: (code: string) => void,
) {
  const cb = useRef(onCode);
  cb.current = onCode;
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;
  useEffect(() => {
    if (!active || !supported || !window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const id = window.setInterval(async () => {
      const el = video.current;
      if (!el || !el.videoWidth) return;
      try {
        const [hit] = await detector.detect(el);
        if (hit) cb.current(hit.rawValue);
      } catch {
        /* frame no legible: se reintenta */
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [active, supported, video]);
  return supported;
}

/**
 * Verificación de casco (RD7). Punto único de integración: intenta el modelo real
 * YOLOv8n-ONNX (helmet-model.ts) sobre la cámara; si no hay modelo, cámara o falla,
 * cae en la simulación clásica para que la demo nunca se rompa.
 */
export type HelmetCheckInput = { video?: HTMLVideoElement | null; simulatedWearing?: boolean };
export type HelmetCheckResult = {
  helmetDetected: boolean;
  confidence: number;
  source: "ia" | "simulacion";
};

export async function detectHelmet({
  video,
  simulatedWearing = true,
}: HelmetCheckInput = {}): Promise<HelmetCheckResult> {
  if (video && video.videoWidth > 0) {
    try {
      const { runHelmetModel } = await import("./helmet-model");
      const result = await runHelmetModel(video);
      return { ...result, source: "ia" };
    } catch {
      /* fallback a simulación */
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  return simulatedWearing
    ? { helmetDetected: true, confidence: 0.93, source: "simulacion" }
    : { helmetDetected: false, confidence: 0.91, source: "simulacion" };
}
