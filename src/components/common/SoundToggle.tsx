import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setMuted, useMuted } from "@/lib/sound";

/** Botón para activar o silenciar los sonidos de la interfaz. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const muted = useMuted();
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      aria-label={muted ? "Activar sonidos" : "Silenciar sonidos"}
      title={muted ? "Activar sonidos" : "Silenciar sonidos"}
      className={className}
      data-testid="sound-toggle"
    >
      {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
    </Button>
  );
}
