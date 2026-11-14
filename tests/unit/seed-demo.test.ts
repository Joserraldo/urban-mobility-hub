import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { seedIfEmpty } from "../../src/server/db/seed";
import { seedDemoData } from "../../src/server/db/seed-demo";

describe("seed de datos demo (UMH_SEED_DEMO=1)", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(readFileSync("src/server/db/schema.sql", "utf8"));
  seedIfEmpty(db);
  seedDemoData(db);
  seedDemoData(db); // idempotente
  const n = (t: string) => (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number }).c;

  it("agrega usuarios, dispositivos, historial y alertas sin duplicar", () => {
    expect(n("users")).toBe(9);
    expect(n("vehicles")).toBe(11 + 6);
    expect(n("reservations")).toBe(9);
    expect(n("deliveries")).toBe(3);
    expect(n("alert_log")).toBe(4);
    expect(n("purchases")).toBe(1);
  });
});
