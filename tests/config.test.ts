import { afterEach, describe, expect, it } from "vitest";
import { isSignupAllowed } from "@/lib/config";
import { signUpSchema } from "@/lib/validation";

const original = process.env.ALLOW_SIGNUP;

afterEach(() => {
  if (original === undefined) delete process.env.ALLOW_SIGNUP;
  else process.env.ALLOW_SIGNUP = original;
});

describe("isSignupAllowed", () => {
  it("defaults to open when unset", () => {
    delete process.env.ALLOW_SIGNUP;
    expect(isSignupAllowed()).toBe(true);
  });

  it("treats empty as open", () => {
    process.env.ALLOW_SIGNUP = "";
    expect(isSignupAllowed()).toBe(true);
  });

  it("accepts true and 1", () => {
    process.env.ALLOW_SIGNUP = "true";
    expect(isSignupAllowed()).toBe(true);
    process.env.ALLOW_SIGNUP = "1";
    expect(isSignupAllowed()).toBe(true);
  });

  it("fails safe on false, 0 and typos", () => {
    for (const value of ["false", "0", "FALSE", "nope"]) {
      process.env.ALLOW_SIGNUP = value;
      expect(isSignupAllowed()).toBe(false);
    }
  });
});

describe("signUpSchema role", () => {
  const base = {
    name: "Ada",
    email: "ada@example.com",
    password: "password123",
  };

  it("defaults a missing role to STUDENT", () => {
    expect(signUpSchema.parse({ ...base, role: null }).role).toBe("STUDENT");
  });

  it("keeps a chosen SUPERVISOR role", () => {
    expect(signUpSchema.parse({ ...base, role: "SUPERVISOR" }).role).toBe(
      "SUPERVISOR",
    );
  });

  it("rejects an unknown role", () => {
    expect(signUpSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(
      false,
    );
  });
});
