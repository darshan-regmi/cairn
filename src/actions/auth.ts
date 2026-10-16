"use server";

import { getAuthProvider, type AuthResult } from "@/lib/auth-provider";
import { emailPasswordSchema, resetPasswordSchema } from "@/lib/validation";

export type { AuthResult };

// Thin wrappers over the configured auth provider. The provider itself does the
// real work and owns the trust boundary; the schemas here give the caller a
// clear message before any work starts.

// The browser creates the Firebase account (cloud) or posts the credentials
// (self-host); this records the account for whichever mode is configured.
export async function registerAccount(input: {
  idToken?: string;
  email?: string;
  password?: string;
  name?: string | null;
  role?: string | null;
}): Promise<AuthResult> {
  const provider = await getAuthProvider();
  return provider.register(input);
}

/** Self-host sign-in. Cloud signs in through the browser SDK instead. */
export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const parsed = emailPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const provider = await getAuthProvider();
  return provider.signIn(parsed.data);
}

/** Starts a self-host password reset. Always reports success. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const parsed = emailPasswordSchema.safeParse({ email, password: "unused" });
  if (!parsed.success) return { success: true };

  const provider = await getAuthProvider();
  // The link itself is only ever logged or emailed, never returned to the
  // requester — otherwise anyone could reset anyone's password.
  await provider.requestPasswordReset(parsed.data.email);
  return { success: true };
}

/** Completes a self-host password reset from the emailed link's token. */
export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const provider = await getAuthProvider();
  return provider.resetPassword(parsed.data.token, parsed.data.password);
}

/** Creates the very first self-host account. Refuses once any user exists. */
export async function createFirstAdmin(input: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<AuthResult> {
  const parsed = emailPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const provider = await getAuthProvider();
  return provider.createFirstAdmin({
    email: parsed.data.email,
    password: parsed.data.password,
    name: input.name,
  });
}

/** Confirms a self-host email address from the link's token. */
export async function verifyEmail(token: string): Promise<AuthResult> {
  if (typeof token !== "string" || token.length === 0) {
    return {
      success: false,
      error: "This verification link is invalid or has expired.",
    };
  }

  const provider = await getAuthProvider();
  return provider.verifyEmail(token);
}
