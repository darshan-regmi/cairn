import { cookies } from "next/headers";
import { getAuthProvider, type Session } from "@/lib/auth-provider";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// The single read of the signed-in user. Which store answers depends on
// DEPLOYMENT_MODE: Firebase in cloud mode, this deployment's own Postgres in
// self-host mode. Callers never need to know which.

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
export type { Session };

/** The signed-in user, or null. Verifies the session cookie. */
export async function auth(): Promise<Session | null> {
  const provider = await getAuthProvider();
  return provider.resolveSession();
}

/** Ends the session. Call from a server action or route handler. */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
