// The httpOnly cookie that carries the signed-in session. Cloud mode puts a
// Firebase session cookie here; self-host mode puts its own HMAC-signed one.
// Only the server ever reads it.

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days

/**
 * Attributes shared by every session cookie we set. `secure` tracks NODE_ENV so
 * plain-http local development still works.
 */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
