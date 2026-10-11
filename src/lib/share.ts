import { randomBytes } from "node:crypto";

// A share link is a read-only capability URL: anyone holding it can read the
// project plan without an account. Unlike invites, the token is stored raw so
// the owner can copy the same link again later — it only ever grants viewing.

/** Byte length of a share token (16 bytes -> 32 hex characters). */
export const SHARE_TOKEN_BYTES = 16;

/** A fresh, unguessable share token. */
export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("hex");
}

/**
 * A share link is live while it has a token and has not passed its expiry.
 * The expiry is stored at the end of the chosen day, so a link set to expire
 * today stays usable until the day is over.
 */
export function isShareActive(
  project: { shareToken: string | null; shareExpiresAt: Date | null },
  now = new Date(),
): boolean {
  if (!project.shareToken) return false;
  if (!project.shareExpiresAt) return true;
  return project.shareExpiresAt.getTime() > now.getTime();
}
