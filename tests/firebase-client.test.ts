import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/firebase/client";

describe("authErrorMessage", () => {
  it("maps known Firebase codes to friendly copy", () => {
    expect(authErrorMessage({ code: "auth/email-already-in-use" }, "x")).toMatch(
      /already exists/,
    );
    expect(authErrorMessage({ code: "auth/wrong-password" }, "x")).toBe(
      "Email or password is incorrect.",
    );
    expect(authErrorMessage({ code: "auth/user-not-found" }, "x")).toBe(
      "Email or password is incorrect.",
    );
  });

  it("falls back for unknown codes and non-error values", () => {
    expect(authErrorMessage({ code: "auth/whatever" }, "fallback")).toBe(
      "fallback",
    );
    expect(authErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    expect(authErrorMessage(null, "fallback")).toBe("fallback");
  });
});
