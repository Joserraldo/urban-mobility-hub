import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "../db";

const COOKIE = "umh_session";
const TTL_MS = 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "operator" | "courier";
};

function secret(): string {
  return process.env["UMH_SESSION_SECRET"] ?? "umh-demo-session-secret-cambiar-en-produccion";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Sesión stateless firmada `nonce.userId.exp.hmac` (RNF-05: el identificador de
 * sesión se firma y expira; en producción se migrará a D1 + rotation de secret).
 */
export function createSession(user: SessionUser): string {
  const nonce = Math.random().toString(36).slice(2, 10);
  const exp = Date.now() + TTL_MS;
  const payload = `${nonce}.${user.id}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionUser(request: Request): SessionUser | null {
  const token = parseCookie(request.headers.get("cookie") ?? "")[COOKIE];
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [sid, userId, expStr, sig] = parts;
  if (!sid || !userId || !expStr || !sig) return null;
  const payload = token.slice(0, token.lastIndexOf("."));
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  if (Number(expStr) < Date.now()) return null;
  const row = getDb()
    .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
    .get(userId) as SessionUser | undefined;
  return row ?? null;
}

export function requireUser(request: Request): SessionUser {
  const user = readSessionUser(request);
  if (!user) throw httpError(401, "Inicia sesión para continuar (UC02)");
  return user;
}

export function requireRole(request: Request, ...roles: SessionUser["role"][]): SessionUser {
  const user = requireUser(request);
  if (!roles.includes(user.role)) throw httpError(403, "Tu rol no puede hacer esto");
  return user;
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL_MS / 1000}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
