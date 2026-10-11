import { describe, expect, it } from "vitest";
import {
  SHARE_TOKEN_BYTES,
  generateShareToken,
  isShareActive,
} from "@/lib/share";

describe("generateShareToken", () => {
  it("makes a 32-character hex token", () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(token).toHaveLength(SHARE_TOKEN_BYTES * 2);
  });

  it("does not repeat", () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => generateShareToken()),
    );
    expect(tokens.size).toBe(50);
  });
});

describe("isShareActive", () => {
  const now = new Date(2026, 5, 15);

  it("is inactive without a token", () => {
    expect(isShareActive({ shareToken: null, shareExpiresAt: null }, now)).toBe(
      false,
    );
  });

  it("is active with a token and no expiry", () => {
    expect(isShareActive({ shareToken: "abc", shareExpiresAt: null }, now)).toBe(
      true,
    );
  });

  it("is active before the expiry", () => {
    expect(
      isShareActive(
        { shareToken: "abc", shareExpiresAt: new Date(2026, 5, 16) },
        now,
      ),
    ).toBe(true);
  });

  it("is inactive once the expiry has passed", () => {
    expect(
      isShareActive(
        { shareToken: "abc", shareExpiresAt: new Date(2026, 5, 14) },
        now,
      ),
    ).toBe(false);
  });

  it("is inactive right at the expiry instant", () => {
    expect(
      isShareActive({ shareToken: "abc", shareExpiresAt: now }, now),
    ).toBe(false);
  });
});
