import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Nfc, QrCode, ScanFace, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/lib/fleet-data";

type Step = "qr" | "helmet" | "ready";

export function UnlockFlow({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [step, setStep] = useState<Step>("qr");

  useEffect(() => {
    if (step !== "helmet") return;
    const t = setTimeout(() => setStep("ready"), 3000);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
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
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X className="size-5" />
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
        <AnimatePresence mode="wait">
          {step === "qr" && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm space-y-6 text-center"
            >
              <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-3xl border border-border bg-secondary/60">
                <div className="absolute inset-0 map-grid opacity-40" />
                <div className="absolute inset-8 rounded-2xl border-2 border-primary/70" />
                <motion.div
                  animate={{ top: ["12%", "84%", "12%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-x-8 h-0.5 bg-gradient-primary shadow-glow"
                />
                <QrCode className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 text-primary-glow/70" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Escanea el código QR</h2>
                <p className="text-sm text-muted-foreground">
                  Apunta la cámara al código impreso en el manubrio del vehículo.
                </p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => setStep("helmet")}>
                  Simular escaneo
                </Button>
                <Button variant="secondary" className="w-full" disabled>
                  <Nfc className="mr-2 size-4" />
                  Desbloquear vía NFC / Wallet (Próximamente)
                </Button>
              </div>
            </motion.div>
          )}

          {step !== "qr" && (
            <motion.div
              key="helmet"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-sm space-y-6 text-center"
            >
              <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border border-border bg-secondary/60">
                <div className="absolute inset-0 map-grid opacity-30" />
                <ScanFace
                  className={`absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 ${
                    step === "ready" ? "text-success" : "text-primary-glow/70"
                  }`}
                />
                {step === "helmet" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-2 border-transparent border-t-primary"
                  />
                )}
                {step === "ready" && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-x-0 bottom-8 flex justify-center"
                  >
                    <CheckCircle2 className="size-12 text-success" />
                  </motion.div>
                )}
              </div>
              <div className="space-y-1">
                <h2 className="flex items-center justify-center gap-2 text-lg font-semibold">
                  <ShieldCheck className="size-5 text-primary-glow" />
                  Helmet Check IA
                </h2>
                <p className="text-sm text-muted-foreground">
                  {step === "helmet"
                    ? "Verificando uso de casco por seguridad..."
                    : "Casco detectado correctamente. Puedes iniciar tu viaje."}
                </p>
              </div>
              <Button
                className="w-full"
                disabled={step !== "ready"}
                onClick={() => {
                  toast.success(`Viaje iniciado con ${vehicle.id}`, {
                    description: "Tarifa por minuto activa. Buen viaje.",
                  });
                  onClose();
                }}
              >
                Iniciar viaje
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
