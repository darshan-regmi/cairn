import { afterEach, describe, expect, it } from "vitest";
import {
  createEmailToken,
  createResetToken,
  createSessionToken,
  credentialVersion,
  readEmailToken,
  readResetToken,
  readSessionToken,
} from "@/lib/tokens";

const original = process.env.SESSION_SECRET;
const SECRET = "a-test-secret-that-is-long-enough-to-sign-tokens";

afterEach(() => {
  if (original === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = original;
});

const START = new Date("2026-01-01T00:00:00.000Z");
const USER = "user_1";
const HASH = "scrypt$32768$8$1$c2FsdA==$a2V5";

describe("credentialVersion", () => {
  it("changes when the password hash changes", () => {
    expect(credentialVersion(HASH)).toBe(credentialVersion(HASH));
    expect(credentialVersion(HASH)).not.toBe(credentialVersion(`${HASH}x`));
  });

  it("treats a missing password as the empty string", () => {
    expect(credentialVersion(null)).toBe(credentialVersion(""));
  });
});

describe("session tokens", () => {
  it("round-trips the user and version", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createSessionToken(USER, HASH, START);
    expect(readSessionToken(token, START)).toEqual({
      userId: USER,
      version: credentialVersion(HASH),
    });
  });

  it("rejects a token signed with a different secret", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createSessionToken(USER, HASH, START);
    process.env.SESSION_SECRET = `${SECRET}-rotated`;
    expect(readSessionToken(token, START)).toBeNull();
  });

  it("rejects a tampered token", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createSessionToken(USER, HASH, START);
    expect(readSessionToken(`${token}x`, START)).toBeNull();
    expect(readSessionToken("not-a-token", START)).toBeNull();
  });

  it("expires with the session lifetime", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createSessionToken(USER, HASH, START);
    const later = new Date(START.getTime() + 5 * 24 * 60 * 60 * 1000 + 1);
    expect(readSessionToken(token, later)).toBeNull();
  });
});

describe("email tokens", () => {
  it("round-trips the user for a week", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createEmailToken(USER, START);
    expect(readEmailToken(token, START)).toEqual({ userId: USER });
    const within = new Date(START.getTime() + 6 * 24 * 60 * 60 * 1000);
    expect(readEmailToken(token, within)).toEqual({ userId: USER });
  });

  it("expires after the week is up", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createEmailToken(USER, START);
    const later = new Date(START.getTime() + 7 * 24 * 60 * 60 * 1000 + 1);
    expect(readEmailToken(token, later)).toBeNull();
  });
});

describe("reset tokens", () => {
  it("binds the link to the current password, so it is single use", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createResetToken(USER, HASH, START);
    expect(readResetToken(token, START)).toEqual({
      userId: USER,
      version: credentialVersion(HASH),
    });
    // After the password changes the version no longer matches, so the same
    // link stops working — that is what makes it single-use without a table.
    const changed = credentialVersion(`${HASH}-new`);
    expect(readResetToken(token, START)?.version).not.toBe(changed);
  });

  it("expires after an hour", () => {
    process.env.SESSION_SECRET = SECRET;
    const token = createResetToken(USER, HASH, START);
    const later = new Date(START.getTime() + 60 * 60 * 1000 + 1);
    expect(readResetToken(token, later)).toBeNull();
  });
});

describe("without a secret", () => {
  it("refuses to sign rather than working silently", () => {
    delete process.env.SESSION_SECRET;
    expect(() => createSessionToken(USER, HASH, START)).toThrow(
      /SESSION_SECRET/,
    );
  });
});
