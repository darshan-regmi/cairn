import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { loginSchema, signUpSchema } from "@/lib/validation";

// Proves the test runner works at all.
describe("test runner", () => {
  it("runs a trivial test", () => {
    expect(1 + 1).toBe(2);
  });
});

describe("password hashing", () => {
  it("round-trips a password", async () => {
    const stored = await hashPassword("secret-pass-123");
    expect(stored).not.toContain("secret-pass-123");
    await expect(verifyPassword("secret-pass-123", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", stored)).resolves.toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    await expect(verifyPassword("x", "not-a-hash")).resolves.toBe(false);
  });
});

describe("auth validation", () => {
  it("accepts a valid sign-up", () => {
    const result = signUpSchema.safeParse({
      name: "Ada",
      email: "  Ada@Example.COM ",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ada@example.com");
    }
  });

  it("allows a missing name field (FormData returns null)", () => {
    const result = signUpSchema.safeParse({
      name: null,
      email: "a@b.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a short password", () => {
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepted by login schema only when credentials are present", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "pw" }).success).toBe(true);
  });
});