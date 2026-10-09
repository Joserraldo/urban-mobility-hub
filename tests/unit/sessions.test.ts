import { beforeAll, describe, expect, it } from "vitest";

/** UC02 / RNF-05: hash con sal y sesión firmada que caduca o se invalida si se altera. */
process.env["UMH_DB_PATH"] = ":memory:";

const { getDb } = await import("../../src/server/db");
const { hashPassword, verifyPassword } = await import("../../src/server/db/seed");
const { createSession, readSessionUser } = await import("../../src/server/services/sessions");
const { repos } = await import("../../src/server/repositories");

const user = { id: "USRA-CLIENTE1", name: "Ana", email: "cliente@demo.co", role: "user" as const };

describe("password hash (RNF-05)", () => {
  beforeAll(() => getDb());

  it("verifica la contraseña correcta y rechaza la incorrecta", () => {
    const hash = hashPassword("Demo1234!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("Demo1234!"); // nunca en texto plano
    expect(verifyPassword("Demo1234!", hash)).toBe(true);
    expect(verifyPassword("no-es", hash)).toBe(false);
  });

  it("dos hash de la misma contraseña difieren (sal aleatoria)", () => {
    expect(hashPassword("abc12345!")).not.toBe(hashPassword("abc12345!"));
  });

  it("las cuentas sembradas usan hash scrypt", () => {
    const row = repos.users.byEmail("domi1@demo.co");
    expect(row?.password_hash.startsWith("scrypt$")).toBe(true);
  });
});

describe("sesión firmada (UC02)", () => {
  beforeAll(() => getDb());

  const requestWith = (cookie: string) =>
    new Request("http://localhost:8080/api/auth/me", { headers: { cookie } });

  it("round-trip: token creado se lee como el mismo usuario", () => {
    const token = createSession(user);
    const got = readSessionUser(requestWith(`umh_session=${token}`));
    expect(got).toMatchObject({ id: "USRA-CLIENTE1", role: "user" });
  });

  it("sin cookie no hay usuario", () => {
    expect(readSessionUser(new Request("http://x/"))).toBeNull();
  });

  it("token adulterado (otro userId) no pasa la firma", () => {
    const token = createSession(user);
    const parts = token.split(".");
    parts[1] = "USRO-OPERADOR"; // intenta robar el rol
    expect(readSessionUser(requestWith(`umh_session=${parts.join(".")}`))).toBeNull();
  });

  it("usuario inexistente en BD no autenticada aunque la firma valga", () => {
    const token = createSession({ id: "NO-EXISTE", name: "x", email: "x@x.co", role: "user" });
    expect(readSessionUser(requestWith(`umh_session=${token}`))).toBeNull();
  });
});
