import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

const PASSWORD = "correct horse battery staple";

describe("hashPassword", () => {
  it("verifies the password it was given", async () => {
    const stored = await hashPassword(PASSWORD);
    expect(await verifyPassword(PASSWORD, stored)).toBe(true);
  });

  it("salts each hash, so the same password stores differently", async () => {
    const first = await hashPassword(PASSWORD);
    const second = await hashPassword(PASSWORD);
    expect(first).not.toBe(second);
    expect(await verifyPassword(PASSWORD, second)).toBe(true);
  });

  it("carries its own parameters", async () => {
    const stored = await hashPassword(PASSWORD);
    const [algorithm, N, r, p] = stored.split("$");
    expect(algorithm).toBe("scrypt");
    expect(Number(N)).toBeGreaterThanOrEqual(2 ** 15);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
  });
});

describe("verifyPassword", () => {
  it("rejects a wrong password", async () => {
    const stored = await hashPassword(PASSWORD);
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(
      false,
    );
  });

  it("returns false for a missing or malformed hash instead of throwing", async () => {
    for (const stored of [
      null,
      undefined,
      "",
      "nonsense",
      "scrypt$1$2$3",
      "bcrypt$32768$8$1$c2FsdA==$a2V5",
    ]) {
      expect(await verifyPassword(PASSWORD, stored)).toBe(false);
    }
  });

  it("rejects a tampered hash", async () => {
    const stored = await hashPassword(PASSWORD);
    expect(await verifyPassword(PASSWORD, `${stored}x`)).toBe(false);
  });
});
