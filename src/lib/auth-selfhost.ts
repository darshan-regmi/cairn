import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import type {
  AuthProvider,
  AuthResult,
  RegisterInput,
  SignInInput,
} from "@/lib/auth-provider";
import { isSignupAllowed } from "@/lib/config";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  clearFailures,
  isRateLimited,
  RATE_LIMITED_MESSAGE,
  recordFailure,
} from "@/lib/rate-limit";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";
import { isEmailConfigured, sendMail } from "@/lib/smtp";
import {
  createEmailToken,
  createResetToken,
  createSessionToken,
  credentialVersion,
  readEmailToken,
  readResetToken,
  readSessionToken,
} from "@/lib/tokens";
import {
  emailPasswordSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation";

// Self-host mode: users, credentials and sessions all live in this deployment's
// own Postgres. No Firebase call is made anywhere in this module.

const USER_SELECT = { id: true, email: true, name: true, role: true } as const;

/** The public origin used in emailed links. */
function appUrl(): string {
  const value = process.env.APP_URL?.trim();
  return (value && value.length > 0 ? value : "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function duplicateAccount(error: unknown): AuthResult | null {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return { success: false, error: "An account with that email already exists." };
  }
  return null;
}

/** Emails a link, or hands it back when no mail server is configured. */
async function deliver(
  to: string,
  subject: string,
  kind: string,
  link: string,
): Promise<AuthResult> {
  if (isEmailConfigured()) {
    await sendMail({
      to,
      subject,
      text: `Open this link to continue:\n\n${link}\n`,
    });
    return { success: true };
  }

  // Unconfigured SMTP degrades to a clear log, never an error.
  console.warn(`[cairn] SMTP is not configured; ${kind} link for ${to}: ${link}`);
  return { success: true, link };
}

/** Sets the httpOnly session cookie for a user. */
async function startSession(userId: string, passwordHash: string | null) {
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    createSessionToken(userId, passwordHash),
    sessionCookieOptions(),
  );
}

export const selfHostAuthProvider: AuthProvider = {
  mode: "selfhost",

  async resolveSession() {
    const value = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (!value) return null;

    const token = readSessionToken(value);
    if (!token) return null;

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { ...USER_SELECT, passwordHash: true },
    });
    // Changing the password rotates this value, which revokes older sessions.
    if (!user || credentialVersion(user.passwordHash) !== token.version) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },

  async needsSetup() {
    return (await prisma.user.count()) === 0;
  },

  async createFirstAdmin(input): Promise<AuthResult> {
    const parsed = emailPasswordSchema.safeParse({
      email: input.email,
      password: input.password,
    });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const name = input.name && input.name.length > 0 ? input.name : undefined;

    // The re-count runs inside the transaction, so two simultaneous first-run
    // requests cannot both create an account.
    const created = await prisma.$transaction(async (tx) => {
      if ((await tx.user.count()) > 0) return false;
      await tx.user.create({
        data: {
          email: normalizeEmail(parsed.data.email),
          name,
          role: "NORMAL",
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });
      return true;
    });

    if (!created) {
      return { success: false, error: "An account already exists. Log in instead." };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(parsed.data.email) },
      select: { id: true },
    });
    if (user) await startSession(user.id, passwordHash);
    return { success: true };
  },

  async register(input: RegisterInput): Promise<AuthResult> {
    if (!isSignupAllowed()) {
      return {
        success: false,
        error: "Sign-ups are closed. Ask the admin to invite you.",
      };
    }

    const parsed = emailPasswordSchema.safeParse({
      email: input.email,
      password: input.password,
    });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const profile = signUpSchema.safeParse({ name: input.name, role: input.role });
    if (!profile.success) {
      return {
        success: false,
        error: profile.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    // With no mail server nobody can open a verification link, so the account
    // starts verified and stays usable. deliver() logs that loudly.
    const verified = !isEmailConfigured();
    const name =
      profile.data.name && profile.data.name.length > 0
        ? profile.data.name
        : undefined;

    let accountId: string;
    try {
      const account = await prisma.user.create({
        data: {
          email: normalizeEmail(parsed.data.email),
          name,
          role: profile.data.role,
          passwordHash: await hashPassword(parsed.data.password),
          emailVerifiedAt: verified ? new Date() : null,
        },
        select: { id: true },
      });
      accountId = account.id;
    } catch (error) {
      const duplicate = duplicateAccount(error);
      if (duplicate) return duplicate;
      throw error;
    }

    if (verified) return { success: true };

    const link = `${appUrl()}/verify/${createEmailToken(accountId)}`;
    return deliver(
      parsed.data.email,
      "Verify your Cairn email address",
      "verify",
      link,
    );
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    const key = `signin:${normalizeEmail(input.email ?? "")}`;
    if (isRateLimited(key)) {
      return { success: false, error: RATE_LIMITED_MESSAGE };
    }

    const parsed = emailPasswordSchema.safeParse({
      email: input.email,
      password: input.password,
    });
    if (!parsed.success) {
      recordFailure(key);
      return { success: false, error: "Email or password is incorrect." };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, passwordHash: true, emailVerifiedAt: true },
    });

    // verifyPassword returns false for a malformed or missing hash, so an
    // account created in cloud mode (no password) cannot log in here.
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      recordFailure(key);
      return { success: false, error: "Email or password is incorrect." };
    }

    if (!user.emailVerifiedAt) {
      recordFailure(key);
      return {
        success: false,
        error: "Verify your email address, then log in.",
      };
    }

    clearFailures(key);
    await startSession(user.id, user.passwordHash);
    return { success: true };
  },

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const parsed = emailPasswordSchema.safeParse({ email, password: "unused" });
    // The response never reveals whether an address has an account.
    if (!parsed.success) return { success: true };

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, passwordHash: true },
    });
    // A cloud-mode account has no password to reset.
    if (!user || !user.passwordHash) return { success: true };

    const link = `${appUrl()}/reset/${createResetToken(user.id, user.passwordHash)}`;
    await deliver(user.email, "Reset your Cairn password", "reset", link);
    return { success: true };
  },

  async resetPassword(token: string, password: string): Promise<AuthResult> {
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    const payload = readResetToken(parsed.data.token);
    const user = payload
      ? await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { passwordHash: true },
        })
      : null;

    if (
      !payload ||
      !user ||
      credentialVersion(user.passwordHash) !== payload.version
    ) {
      return { success: false, error: "This reset link is invalid or has expired." };
    }

    // Guarding on the old hash makes the link single-use: a second attempt finds
    // a different hash and matches nothing.
    const updated = await prisma.user.updateMany({
      where: { id: payload.userId, passwordHash: user.passwordHash },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
        emailVerifiedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      return { success: false, error: "This reset link is invalid or has expired." };
    }

    return { success: true };
  },

  async verifyEmail(token: string): Promise<AuthResult> {
    const payload = readEmailToken(token);
    if (!payload) {
      return {
        success: false,
        error: "This verification link is invalid or has expired.",
      };
    }

    await prisma.user.updateMany({
      where: { id: payload.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    return { success: true };
  },
};
