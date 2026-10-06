export * from "./domain";
export * from "./telemetry";
export * from "./realtime";
export * from "./api";

/** Respuesta de login/registro: el token va también en cookie HttpOnly `umh_session`. */
import type { User } from "./domain";
export interface AuthResponse {
  user: User;
  /** token opaco; enviar como `Authorization: Bearer <token>` si no se usan cookies */
  token: string;
}
