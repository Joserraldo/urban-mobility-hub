type Subscriber = (event: string, data: string) => void;

const subs = new Set<Subscriber>();

/** Hub SSE de desarrollo: posiciones, alertas y notificaciones van por aquí (RNF-01/RNF-02). */
export const stream = {
  add(sub: Subscriber): () => void {
    subs.add(sub);
    return () => subs.delete(sub);
  },
  emit(type: "position" | "alert" | "vehicle" | "notification", payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const s of subs) {
      try {
        s(type, data);
      } catch {
        /* cliente muerto: lo limpia su finally */
      }
    }
  },
};
