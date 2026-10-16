import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import type {
  AuthProvider,
  AuthResult,
  RegisterInput,
  SignInInput,
} from "@/lib/auth-provider";
import { isSignupAllowed } from "@/lib/config";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validation";

// Cloud mode: Firebase owns the credential. The browser creates the account and
// signs in; this side only verifies tokens and mints the session cookie, exactly
// as it did before the self-host work.
//
// firebase-admin is reached through a dynamic import so nothing pulls it into a
// self-host process.

const USER_SELECT = { id: true, email: true, name: true, role: true } as const;

/** The only fields of a Firebase token this app reads. */
type Decoded = { uid: string; email?: string | null; email_verified?: boolean };

async function adminAuth() {
  return (await import("@/lib/firebase/admin")).adminAuth();
}

const unavailable: AuthResult = {
  success: false,
  error: "This action is only available in self-hosted mode.",
};

export const firebaseAuthProvider: AuthProvider = {
  mode: "cloud",

  async resolveSession() {
    const value = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (!value) return null;

    try {
      // checkRevoked so a disabled account stops working before the cookie expires.
      const decoded = (await (
        await adminAuth()
      ).verifySessionCookie(value, true)) as Decoded;
      const user = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: USER_SELECT,
      });
      return user ? { user } : null;
    } catch {
      // Expired, revoked or tampered with: the caller sees a signed-out user.
      return null;
    }
  },

  // Self-host concepts. Setup in particular makes no sense: in cloud mode the
  // account comes from Firebase, not from this app.
  async needsSetup() {
    return false;
  },
  async createFirstAdmin() {
    return unavailable;
  },
  async verifyEmail() {
    return unavailable;
  },
  async resetPassword() {
    return unavailable;
  },
  // The browser SDK sends the reset email itself; nothing to do here.
  async requestPasswordReset() {
    return { success: true };
  },

  async register(input: RegisterInput): Promise<AuthResult> {
    if (!isSignupAllowed()) {
      return {
        success: false,
        error: "Sign-ups are closed. Ask the admin to invite you.",
      };
    }

    const parsed = signUpSchema.safeParse({ name: input.name, role: input.role });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    if (!input.idToken) {
      return { success: false, error: "Could not verify your account. Try again." };
    }

    let decoded: Decoded;
    try {
      decoded = (await (await adminAuth()).verifyIdToken(input.idToken)) as Decoded;
    } catch {
      return { success: false, error: "Could not verify your account. Try again." };
    }

    if (!decoded.email) {
      return { success: false, error: "Your account has no email address." };
    }

    const name =
      parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : undefined;

    try {
      await prisma.user.create({
        data: {
          email: decoded.email.toLowerCase(),
          name,
          role: parsed.data.role,
          firebaseUid: decoded.uid,
        },
      });
      return { success: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { success: false, error: "An account with that email already exists." };
      }
      throw error;
    }
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    if (!input.idToken) {
      return { success: false, status: 400, error: "Missing token." };
    }

    try {
      const auth = await adminAuth();
      const decoded = (await auth.verifyIdToken(input.idToken)) as Decoded;

      // An unverified address must never open a session.
      if (!decoded.email_verified || !decoded.email) {
        return {
          success: false,
          status: 403,
          error: "Verify your email address first.",
        };
      }

      const account = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { id: true },
      });
      if (!account) {
        return {
          success: false,
          status: 403,
          error: "No account is linked to this login.",
        };
      }

      const cookie = await auth.createSessionCookie(input.idToken, {
        expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
      });
      (await cookies()).set(SESSION_COOKIE_NAME, cookie, sessionCookieOptions());

      return { success: true };
    } catch {
      return { success: false, status: 401, error: "Could not start a session." };
    }
  },
};
