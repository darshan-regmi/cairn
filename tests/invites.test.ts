import { describe, expect, it } from "vitest";
import {
  INVITE_TTL_DAYS,
  generateInviteToken,
  hashInviteToken,
  inviteExpiry,
  isInviteUsable,
} from "@/lib/invites";

describe("invite tokens", () => {
  it("generates 48 hex characters", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("generates a different token every time", () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken());
  });

  it("hashes deterministically and never returns the raw token", () => {
    const token = generateInviteToken();
    const hash = hashInviteToken(token);
    expect(hash).toBe(hashInviteToken(token));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashInviteToken(generateInviteToken())).not.toBe(hash);
  });
});

describe("invite expiry", () => {
  it("expires INVITE_TTL_DAYS after the given time", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiresAt = inviteExpiry(now);
    const days = Math.round(
      (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(days).toBe(INVITE_TTL_DAYS);
  });
});

describe("isInviteUsable", () => {
  const now = new Date("2026-01-10T00:00:00Z");

  it("accepts a pending, unexpired invite", () => {
    expect(
      isInviteUsable(
        { expiresAt: new Date("2026-01-11T00:00:00Z"), acceptedAt: null },
        now,
      ),
    ).toBe(true);
  });

  it("rejects an accepted invite", () => {
    expect(
      isInviteUsable(
        {
          expiresAt: new Date("2026-01-11T00:00:00Z"),
          acceptedAt: new Date("2026-01-09T00:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });

  it("rejects an expired invite", () => {
    expect(
      isInviteUsable(
        { expiresAt: new Date("2026-01-09T00:00:00Z"), acceptedAt: null },
        now,
      ),
    ).toBe(false);
  });
});
