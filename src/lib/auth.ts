import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/roles";

// Firebase owns the credential; the browser exchanges a freshly signed-in ID
// token for this httpOnly session cookie (see app/api/auth/session/route.ts).
// The cookie is the only thing the server trusts — no auth state is read from
// the client.
export const SESSION_COOKIE_NAME = "__session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days

export type Session = {
  user: { id: string; email: string; name: string | null; role: UserRole };
};

/** The signed-in user, or null. Verifies the cookie, then resolves the row. */
export async function auth(): Promise<Session | null> {
  const value = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;

  try {
    // checkRevoked so a disabled account stops working before the cookie expires.
    const decoded = await adminAuth().verifySessionCookie(value, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, email: true, name: true, role: true },
    });
    return user ? { user } : null;
  } catch {
    // Expired, revoked or tampered with: the caller sees a signed-out user.
    return null;
  }
}

/** Ends the session. Call from a server action or route handler. */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
