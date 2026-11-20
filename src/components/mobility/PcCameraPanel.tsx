import { Camera, CameraOff, ShieldCheck, ShieldX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getDataSource } from "@/lib/data";
import type { PcCameraVerdict, Vehicle } from "@/lib/data/types";

const INTERVAL_MS = 400;

/**
 * Demo local: usa la webcam del PC como si fuera la ESP32-CAM de un vehículo.
 * Captura JPEG 640x480 y lo manda al relay del servidor (sin esperar: nunca hay 2 envíos en vuelo).
 */
export function PcCameraPanel() {
  const ds = getDataSource();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [active, setActive] = useState(false);
  const [verdict, setVerdict] = useState<PcCameraVerdict | null>(null);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    ds.listVehicles({ mode: "rent" })
      .then((list) => {
        setVehicles(list);
        setVehicleId((cur) => cur || list[0]?.id || "");
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudo cargar la flota"),
      );
  }, [ds]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError(
        "No se pudo abrir la webcam (permiso denegado o sin cámara). Usa http://localhost o HTTPS.",
      );
    }
  };

  useEffect(() => {
    if (!active || !vehicleId) return;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    let times: number[] = [];
    (async () => {
      while (!cancelled) {
        const t0 = performance.now();
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          canvas.getContext("2d")?.drawImage(video, 0, 0, 640, 480);
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.7));
          if (blob && !cancelled) {
            try {
              const v = await ds.sendPcCameraFrame(vehicleId, blob);
              if (cancelled) break;
              setVerdict(v);
              setError(null);
              const now = performance.now();
              times = [...times.filter((t) => now - t < 3000), now];
              setFps(times.length / 3);
            } catch (e) {
              if (!cancelled)
                setError(e instanceof Error ? e.message : "Error al enviar el fotograma");
            }
          }
        }
        const wait = INTERVAL_MS - (performance.now() - t0);
        await new Promise((r) => setTimeout(r, Math.max(wait, error ? 1500 : 0)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // `error` solo frena el ritmo tras fallos; no debe reiniciar el bucle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, vehicleId, ds]);

  return (
    <section className="rounded-2xl border border-border p-4 space-y-3">
      <h2 className="text-lg font-semibold">Cámara del PC (demo de casco)</h2>
      <p className="text-sm text-muted-foreground">
        Abre el desbloqueo de ese vehículo en el celular (por el túnel) y la verificación de casco
        usará esta cámara.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={vehicleId}
          disabled={active}
          onChange={(e) => setVehicleId(e.target.value)}
          aria-label="Vehículo"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id} · {v.model}
            </option>
          ))}
        </select>
        {active ? (
          <Button variant="outline" onClick={stop}>
            <CameraOff className="mr-2 h-4 w-4" /> Detener
          </Button>
        ) : (
          <Button onClick={start} disabled={!vehicleId}>
            <Camera className="mr-2 h-4 w-4" /> Activar webcam
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full rounded-lg bg-black aspect-[4/3]"
        />
        <div className="space-y-2 text-sm" aria-live="polite">
          {active && verdict ? (
            <>
              <p className="flex items-center gap-2 text-base font-semibold">
                {verdict.helmetDetected ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ShieldX className="h-5 w-5 text-red-500" />
                )}
                {verdict.helmetDetected ? "Con casco" : "Sin casco"}
              </p>
              <p>Confianza: {Math.round(verdict.confidence * 100)} %</p>
              <p>Velocidad: {fps.toFixed(1)} fps</p>
            </>
          ) : (
            <p className="text-muted-foreground">
              {active ? "Esperando veredicto…" : "Webcam apagada."}
            </p>
          )}
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </div>
    </section>
  );
}
