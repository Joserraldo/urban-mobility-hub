/**
 * Puerto de visión: el backend (no el ESP32-CAM) decide si hay casco. La cámara solo envía JPEG.
 * Las implementaciones concretas (ONNX Runtime hoy; otra cosa mañana) viven en adapters/vision.
 */
export interface HelmetVerdict {
  /** true si el casco puesto supera al "sin casco" y al umbral del modelo */
  helmetDetected: boolean;
  /** confianza 0-1 de la decisión (casco si hay casco; sin-casco si no) */
  confidence: number;
  /** ms que tardó la inferencia (preprocesado + modelo + NMS) */
  inferenceMs: number;
}

export interface HelmetDetector {
  readonly ready: boolean;
  /** Analiza un JPEG. Lanza si la imagen no se puede decodificar. */
  detect(jpeg: Uint8Array): Promise<HelmetVerdict>;
}
