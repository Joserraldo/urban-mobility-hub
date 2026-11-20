import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedIfEmpty } from "./seed";
import { seedDemoData } from "./seed-demo";

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
    migrateVehicleStatus(db);
    db.exec(readFileSync(SCHEMA_PATH, "utf8"));
    seedIfEmpty(db);
    if (process.env["UMH_SEED_DEMO"] === "1") seedDemoData(db);
  }
  return db;
}

/**
 * SQLite no permite alterar un CHECK: si `vehicles` viene de una BD anterior (sin el estado
 * 'maintenance') se recrea la tabla con el procedimiento oficial (create new, copy, drop, rename).
 * Idempotente: si el CHECK ya incluye 'maintenance' no hace nada. Corre ANTES del schema.sql
 * para que los índices se vuelvan a crear sobre la tabla nueva.
 */
export function migrateVehicleStatus(d: DatabaseSync): void {
  const r = d
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='vehicles'")
    .get() as { sql: string } | undefined;
  if (!r || r.sql.includes("'maintenance'")) return;
  const next = r.sql
    .replace(/CREATE TABLE (IF NOT EXISTS )?"?vehicles"?/i, "CREATE TABLE vehicles_new")
    .replace("'sold','offline'", "'sold','offline','maintenance'");
  if (!next.includes("'maintenance'")) return;
  d.exec("PRAGMA foreign_keys = OFF;");
  d.exec("BEGIN");
  try {
    d.exec("DROP TABLE IF EXISTS vehicles_new;");
    d.exec(next);
    d.exec("INSERT INTO vehicles_new SELECT * FROM vehicles;");
    d.exec("DROP TABLE vehicles;");
    d.exec("ALTER TABLE vehicles_new RENAME TO vehicles;");
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  } finally {
    d.exec("PRAGMA foreign_keys = ON;");
  }
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
    "bold_orders",
    "payments",
    "purchases",
    "reservations",
    "unlock_sessions",
    "alert_log",
    "telemetry_log",
    "maintenance_orders",
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
