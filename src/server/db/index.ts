import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedIfEmpty } from "./seed";

const DB_PATH = process.env["UMH_DB_PATH"] ?? "data/umh.db";
// El config de Vite se empaqueta sin loader `?raw`: leemos la ruta canónica en runtime.
const SCHEMA_PATH = join(process.cwd(), "src", "server", "db", "schema.sql");

let db: DatabaseSync | undefined;

/**
 * Única conexión SQLite del proceso de desarrollo (demo local).
 * En producción el mismo `schema.sql` corre en D1 vía `wrangler d1 migrations`
 * (ver entregables/gcs/despliegue.md). Devuelve SQL puro: los nombres de tabla
 * de este archivo son los que aparecen en los diagramas de secuencia.
 */
export function getDb(): DatabaseSync {
  if (!db) {
    if (DB_PATH !== ":memory:") mkdirSync(dirnameSafe(DB_PATH), { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(readFileSync(SCHEMA_PATH, "utf8"));
    seedIfEmpty(db);
  }
  return db;
}

function dirnameSafe(file: string): string {
  const i = file.lastIndexOf("/");
  const j = file.lastIndexOf("\\");
  const k = Math.max(i, j);
  return k < 0 ? "." : file.slice(0, k);
}

/** Reinicia la BD de demo (borra filas y vuelve a sembrar). Solo desarrollo. */
export function resetDb(): void {
  const d = getDb();
  for (const t of [
    "notifications",
    "deliveries",
    "payments",
    "purchases",
    "reservations",
    "unlock_sessions",
    "alert_log",
    "biometric_templates",
    "consents",
    "vehicles",
    "hubs",
    "users",
  ]) {
    d.exec(`DELETE FROM ${t};`);
  }
  seedIfEmpty(d);
}
