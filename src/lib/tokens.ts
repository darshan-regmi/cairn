import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session";

// Stateless, signed capability tokens for the self-host flow: sessions, email
// verification and password reset. Nothing is stored in the database — the
// signature *is* the capability, and the payload carries its own expiry.
//
// Sessions and reset links also carry a short hash of the user's current
// password hash. Changing the password changes that value, which revokes every
// session minted before it and makes a reset link single-use — with no extra
// table and no cleanup job.

const EMAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const SESSION_TTL_MS = SESSION_MAX_AGE_SECONDS * 1000;

type Payload = { u: string; e: number; v?: string };

function secret(): Buffer {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set.");
  return Buffer.from(value, "utf8");
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function issue(payload: Payload, now: Date): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, e: now.getTime() + payload.e }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

function read(token: string, now: Date): Payload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!equal(sign(body), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (typeof payload.u !== "string" || typeof payload.e !== "number") return null;
    if (payload.e <= now.getTime()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** The value bound into a session or reset token: it changes with the password. */
export function credentialVersion(passwordHash: string | null): string {
  return createHash("sha256").update(passwordHash ?? "").digest("hex").slice(0, 16);
}

export function createSessionToken(
  userId: string,
  passwordHash: string | null,
  now = new Date(),
): string {
  return issue({ u: userId, e: SESSION_TTL_MS, v: credentialVersion(passwordHash) }, now);
}

export function readSessionToken(
  token: string,
  now = new Date(),
): { userId: string; version: string } | null {
  const payload = read(token, now);
  if (!payload || typeof payload.v !== "string") return null;
  return { userId: payload.u, version: payload.v };
}

/** A link that proves control of an email address. */
export function createEmailToken(userId: string, now = new Date()): string {
  return issue({ u: userId, e: EMAIL_TTL_MS }, now);
}

export function readEmailToken(
  token: string,
  now = new Date(),
): { userId: string } | null {
  const payload = read(token, now);
  return payload ? { userId: payload.u } : null;
}

export function createResetToken(
  userId: string,
  passwordHash: string | null,
  now = new Date(),
): string {
  return issue({ u: userId, e: RESET_TTL_MS, v: credentialVersion(passwordHash) }, now);
}

export function readResetToken(
  token: string,
  now = new Date(),
): { userId: string; version: string } | null {
  const payload = read(token, now);
  if (!payload || typeof payload.v !== "string") return null;
  return { userId: payload.u, version: payload.v };
}
