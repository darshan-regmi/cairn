import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  // A real redirect hands control away by throwing; mirror that so the action
  // stops exactly where it would in production.
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  RESET_TTL_HOURS,
  generateResetToken,
  hashResetToken,
  isResetUsable,
  resetExpiry,
} from "@/lib/reset";
import { completeResetSchema, requestResetSchema } from "@/lib/validation";
import {
  completePasswordResetAction,
  requestPasswordResetAction,
} from "@/actions/reset";

describe("reset token helpers", () => {
  it("generates distinct 48-character tokens", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).toMatch(/^[0-9a-f]{48}$/);
    expect(a).not.toBe(b);
  });

  it("hashes deterministically without keeping the raw token", () => {
    const token = "raw-token-value";
    expect(hashResetToken(token)).toBe(hashResetToken(token));
    expect(hashResetToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashResetToken(token)).not.toContain(token);
  });

  it("expires exactly RESET_TTL_HOURS after creation", () => {
    const now = new Date(2026, 0, 1, 12, 0, 0);
    expect(resetExpiry(now).getTime() - now.getTime()).toBe(
      RESET_TTL_HOURS * 60 * 60 * 1000,
    );
  });

  it("is usable only before expiry and before first use", () => {
    const now = new Date(2026, 0, 1, 12, 0, 0);
    const future = new Date(now.getTime() + 1000);
    const past = new Date(now.getTime() - 1000);
    expect(isResetUsable({ expiresAt: future, usedAt: null }, now)).toBe(true);
    expect(isResetUsable({ expiresAt: past, usedAt: null }, now)).toBe(false);
    expect(isResetUsable({ expiresAt: future, usedAt: now }, now)).toBe(false);
  });
});

describe("reset validation", () => {
  it("requires a valid email and a long enough token", () => {
    expect(
      requestResetSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
    expect(
      completeResetSchema.safeParse({
        token: "short",
        password: "password123",
        confirm: "password123",
      }).success,
    ).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = completeResetSchema.safeParse({
      token: generateResetToken(),
      password: "password123",
      confirm: "password124",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Passwords do not match.");
    }
  });
});

const describeDb = describe.skipIf(!process.env.DATABASE_URL);

describeDb("password reset actions (DB)", () => {
  let userId = "";
  let email = "";
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
    const tag = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    email = `reset_${tag}@fyp-planner.test`;
    const user = await prisma.user.create({
      data: { email, passwordHash: "scrypt:0:old", name: "Reset User" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    consoleSpy.mockRestore();
  });

  it("returns a link for a real account and stays quiet about a missing one", async () => {
    const known = new FormData();
    known.set("email", email);
    const found = await requestPasswordResetAction({ success: false }, known);
    expect(found.success).toBe(true);
    expect(found.resetUrl).toMatch(/^\/reset\/[0-9a-f]{48}$/);

    const unknown = new FormData();
    unknown.set("email", `nobody_${Date.now()}@fyp-planner.test`);
    const missing = await requestPasswordResetAction(
      { success: false },
      unknown,
    );
    expect(missing.success).toBe(true);
    expect(missing.resetUrl).toBeUndefined();
  });

  it("refuses a token that has already expired", async () => {
    const raw = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashResetToken(raw),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const form = new FormData();
    form.set("token", raw);
    form.set("password", "newpassword123");
    form.set("confirm", "newpassword123");
    const result = await completePasswordResetAction({ success: false }, form);
    expect(result.success).toBe(false);
  });

  it("sets the password, consumes the token and retires the rest", async () => {
    const raw = generateResetToken();
    const other = generateResetToken();
    await prisma.passwordResetToken.createMany({
      data: [
        { userId, tokenHash: hashResetToken(raw), expiresAt: resetExpiry() },
        { userId, tokenHash: hashResetToken(other), expiresAt: resetExpiry() },
      ],
    });

    const form = new FormData();
    form.set("token", raw);
    form.set("password", "newpassword123");
    form.set("confirm", "newpassword123");

    redirectMock.mockClear();
    await expect(
      completePasswordResetAction({ success: false }, form),
    ).rejects.toThrow("NEXT_REDIRECT:/login?reset=1");
    expect(redirectMock).toHaveBeenCalledWith("/login?reset=1");

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });
    expect(await verifyPassword("newpassword123", updated.passwordHash)).toBe(
      true,
    );
    expect(await verifyPassword("old", updated.passwordHash)).toBe(false);

    // No unused links survive; the spent one is marked used rather than deleted.
    const unused = await prisma.passwordResetToken.count({
      where: { userId, usedAt: null },
    });
    expect(unused).toBe(0);
    const spent = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(raw) },
      select: { usedAt: true },
    });
    expect(spent?.usedAt).not.toBeNull();
  });
});
