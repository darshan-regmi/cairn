import { createHash, randomBytes } from "node:crypto";

// Password reset links follow the invite pattern: the raw token travels in the
// link, the database keeps only a SHA-256 hash, and the token is single-use.
// No SMTP is required — the fallback is a copy-link shown on the request page.

/** How long a reset link stays valid. */
export const RESET_TTL_HOURS = 1;

/** A fresh, unguessable reset token (48 hex characters). */
export function generateResetToken(): string {
  return randomBytes(24).toString("hex");
}

/** The value stored in PasswordResetToken.tokenHash. Never reversible. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Expiry for a new reset link: RESET_TTL_HOURS from now. */
export function resetExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RESET_TTL_HOURS * 60 * 60 * 1000);
}

/** A reset link is usable when it has not been used and has not expired. */
export function isResetUsable(
  token: { expiresAt: Date; usedAt: Date | null },
  now = new Date(),
): boolean {
  return (
    token.usedAt === null && token.expiresAt.getTime() > now.getTime()
  );
}
