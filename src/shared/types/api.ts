/**
 * Contrato REST (peticiones/respuestas/errores). Se valida con zod en el servidor y
 * el frontend puede reutilizar los mismos esquemas en formularios.
 * Documentación humana: docs/api/openapi.yaml
 */
import { z } from "zod";
import type { PaymentMethod, RentalModality, VehicleKind, VehicleMode } from "./domain";

// ---------- Errores ----------
export const API_ERROR_CODES = [
  "VALIDATION_ERROR", // 400
  "UNAUTHENTICATED", // 401
  "INVALID_CREDENTIALS", // 401
  "FORBIDDEN", // 403
  "NOT_FOUND", // 404
  "CONFLICT", // 409 (genérico)
  "EMAIL_TAKEN", // 409
  "VEHICLE_UNAVAILABLE", // 409
  "INVALID_TRANSITION", // 409
  "CONSENT_REQUIRED", // 422
  "HELMET_NOT_VERIFIED", // 422
  "QR_MISMATCH", // 422
  "FACE_NOT_MATCHED", // 422
  "BIOMETRIC_NOT_ENROLLED", // 422
  "UNLOCK_STEP_ORDER", // 422
  "UNLOCK_EXPIRED", // 422
  "RATE_LIMITED", // 429
  "INTERNAL_ERROR", // 500
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Forma ÚNICA de error en toda la API: `{ "error": { code, message, details? } }` */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

// ---------- Auth (RF-10, RNF-05, RD11) ----------
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(128),
  /** Aceptación explícita del tratamiento de datos personales (Ley 1581). Debe ser true. */
  consent: z.literal(true, { errorMap: () => ({ message: "Debes aceptar el tratamiento de datos" }) }),
});
export type RegisterRequest = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof loginSchema>;

/** Descriptor facial (p. ej. face-api.js = 128 floats). El servidor lo cifra antes de guardarlo. */
export const faceDescriptorSchema = z.array(z.number().finite()).min(16).max(512);

export const faceEnrollSchema = z.object({
  descriptor: faceDescriptorSchema,
  /** consentimiento SEPARADO y explícito para datos biométricos (dato sensible) */
  biometricConsent: z.literal(true),
});
export type FaceEnrollRequest = z.infer<typeof faceEnrollSchema>;

// ---------- Compras / reservas ----------
export const purchaseSchema = z.object({
  vehicleId: z.string().min(1).max(40),
  paymentMethod: z.enum(["card", "pse", "cash"]).default("card"),
});
export type PurchaseRequest = { vehicleId: string; paymentMethod?: PaymentMethod };

export const reservationSchema = z
  .object({
    vehicleId: z.string().min(1).max(40),
    modality: z.enum(["hub", "delivery"]),
    address: z.string().trim().min(5).max(200).optional(),
  })
  .refine((r) => r.modality !== "delivery" || !!r.address, {
    message: "La entrega a domicilio requiere dirección",
    path: ["address"],
  });
export type ReservationRequest = {
  vehicleId: string;
  modality: RentalModality;
  address?: string;
};

// ---------- Desbloqueo (RF-09, RF-10) ----------
export const unlockStartSchema = z.object({ reservationId: z.string().min(1) });
export const unlockQrSchema = z.object({ code: z.string().min(1).max(80) });
export const unlockHelmetSchema = z.object({
  helmetDetected: z.boolean(),
  /** confianza 0-1 del modelo de visión; se acepta con >= 0.8 */
  confidence: z.number().min(0).max(1),
});
export const unlockFaceSchema = z.object({ descriptor: faceDescriptorSchema });

// ---------- Catálogo / simulador / admin ----------
export interface VehicleQuery {
  mode?: VehicleMode;
  kind?: VehicleKind;
  hubId?: string;
}

export const simulateAlertSchema = z.object({
  vehicleId: z.string().min(1),
  type: z.enum(["no-helmet", "crash", "gps-lost", "low-battery"]),
});
export type SimulateAlertRequest = z.infer<typeof simulateAlertSchema>;

export const hubInputSchema = z.object({
  id: z.string().regex(/^HUB-[A-Z0-9]+$/),
  name: z.string().min(2).max(80),
  zone: z.string().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  capacity: z.number().int().min(1).max(500),
  occupied: z.number().int().min(0).default(0),
  charging: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export const hubPatchSchema = hubInputSchema.partial().omit({ id: true });

export const vehicleInputSchema = z.object({
  id: z.string().regex(/^[A-Z]{2}-[0-9]{3,6}$/),
  kind: z.enum(["scooter", "bike", "drone"]),
  model: z.string().min(2).max(80),
  mode: z.enum(["rent", "sale"]),
  battery: z.number().int().min(0).max(100).default(100),
  pricePerMinute: z.number().int().positive().optional(),
  price: z.number().int().positive().optional(),
  condition: z.enum(["nuevo", "seminuevo"]).optional(),
  spec: z.string().min(2).max(160),
  hubId: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  delivery: z.boolean().optional(),
});
export const vehiclePatchSchema = vehicleInputSchema.partial().omit({ id: true });
export type VehicleInput = z.infer<typeof vehicleInputSchema>;
export type HubInput = z.infer<typeof hubInputSchema>;
