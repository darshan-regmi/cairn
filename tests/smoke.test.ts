import { describe, expect, it } from "vitest";
import { signUpSchema } from "@/lib/validation";

// Proves the test runner works at all.
describe("test runner", () => {
  it("runs a trivial test", () => {
    expect(1 + 1).toBe(2);
  });
});

describe("auth validation", () => {
  it("allows a missing name field (FormData returns null)", () => {
    const result = signUpSchema.safeParse({ name: null });
    expect(result.success).toBe(true);
  });

  it("trims a name and rejects an over-long one", () => {
    const trimmed = signUpSchema.safeParse({ name: "  Ada  " });
    expect(trimmed.success && trimmed.data.name).toBe("Ada");

    const tooLong = signUpSchema.safeParse({ name: "a".repeat(81) });
    expect(tooLong.success).toBe(false);
  });
});
