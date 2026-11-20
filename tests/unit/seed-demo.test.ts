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
    expect(n("users")).toBe(10);
    expect(n("vehicles")).toBe(11 + 6 + 3);
    expect(n("reservations")).toBe(9 + 3);
    expect(n("deliveries")).toBe(3);
    expect(n("alert_log")).toBe(4);
    expect(n("purchases")).toBe(1);
  });

  it("deja 3 alquileres en vivo (in_use + reserva activa) y los reactiva al reiniciar", () => {
    const q = () =>
      db
        .prepare(
          "SELECT id FROM vehicles WHERE status = 'in_use' AND id IN ('SC-1201','SC-1202','BK-2203')",
        )
        .all();
    expect(q()).toHaveLength(3);
    db.prepare("UPDATE vehicles SET status = 'available' WHERE id = 'SC-1201'").run();
    db.prepare("UPDATE reservations SET status = 'completed' WHERE id = 'RES-DEMO-LIVE-1'").run();
    seedDemoData(db);
    expect(q()).toHaveLength(3);
    expect(n("reservations")).toBe(9 + 3);
    expect(
      (
        db.prepare("SELECT status s FROM reservations WHERE id = 'RES-DEMO-LIVE-1'").get() as {
          s: string;
        }
      ).s,
    ).toBe("active");
  });
});
