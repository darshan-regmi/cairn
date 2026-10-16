import type { DeploymentMode } from "@/lib/deployment";
import type { UserRole } from "@/lib/roles";

// The seam between the app and whoever owns the login credential. Cloud mode
// answers with Firebase; self-host mode answers with its own Postgres rows.
//
// Only this interface is shared — everything that talks to Firebase lives behind
// a dynamic import in src/lib/auth-firebase.ts, so a self-host process never
// loads the SDK at all.

export type Session = {
  user: { id: string; email: string; name: string | null; role: UserRole };
};

export type AuthResult = {
  success: boolean;
  error?: string;
  /** HTTP status, for the one caller that must answer a URL (the session route). */
  status?: number;
  /**
   * A verification link, returned only when it could not be emailed — so the
   * person who just signed up can still get in on a host with no mail server.
   */
  link?: string;
};

export type RegisterInput = {
  // Cloud: a Firebase ID token. Self-host: email + password.
  idToken?: string;
  email?: string;
  password?: string;
  name?: string | null;
  role?: string | null;
};

export type SignInInput = {
  idToken?: string;
  email?: string;
  password?: string;
};

export interface AuthProvider {
  readonly mode: DeploymentMode;

  /** The signed-in user, or null. Verifies the session cookie. */
  resolveSession(): Promise<Session | null>;

  /** True while no account exists yet, so first-run setup must be shown. */
  needsSetup(): Promise<boolean>;

  /** Creates the very first account. Refuses once any user exists. */
  createFirstAdmin(input: {
    email: string;
    password: string;
    name?: string | null;
  }): Promise<AuthResult>;

  register(input: RegisterInput): Promise<AuthResult>;

  signIn(input: SignInInput): Promise<AuthResult>;

  requestPasswordReset(email: string): Promise<AuthResult>;

  /** Sets a new password from a reset link. */
  resetPassword(token: string, password: string): Promise<AuthResult>;

  /** Marks the address verified from a verification link. */
  verifyEmail(token: string): Promise<AuthResult>;
}

/**
 * The adapter for the configured mode. The import is dynamic so the Firebase
 * modules are only ever loaded for a cloud deployment.
 */
export async function getAuthProvider(): Promise<AuthProvider> {
  if (process.env.DEPLOYMENT_MODE === "selfhost") {
    return (await import("@/lib/auth-selfhost")).selfHostAuthProvider;
  }
  return (await import("@/lib/auth-firebase")).firebaseAuthProvider;
}
