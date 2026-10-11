import { createHash, randomBytes } from "node:crypto";

// Invite links are secret capability links: the raw token is shown to the
// student once and stored only as a SHA-256 hash, so a database leak does not
// hand out working invites. No SMTP is required — the student just copies the
// link and sends it themselves.

export const INVITE_TTL_DAYS = 7;

/** A fresh, unguessable invite token (48 hex characters). */
export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}

/** The value stored in Invite.tokenHash. Never reversible. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Expiry for a new invite: INVITE_TTL_DAYS from now. */
export function inviteExpiry(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
  return expiresAt;
}

/** A pending invite is usable when it has not been accepted and not expired. */
export function isInviteUsable(
  invite: { expiresAt: Date; acceptedAt: Date | null },
  now = new Date(),
): boolean {
  return invite.acceptedAt === null && invite.expiresAt.getTime() > now.getTime();
}