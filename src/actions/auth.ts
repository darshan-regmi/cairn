"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isSignupAllowed } from "@/lib/config";
import { adminAuth } from "@/lib/firebase/admin";
import { signUpSchema } from "@/lib/validation";

export type RegisterAccountResult = {
  success: boolean;
  error?: string;
};

// The browser creates the Firebase account (so Firebase can send the
// verification email); this records the app-side row. The ID token is verified
// here, so the email and uid cannot be spoofed by the client.
export async function registerAccount(input: {
  idToken: string;
  name?: string | null;
  role?: string | null;
}): Promise<RegisterAccountResult> {
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

  let decoded: Awaited<ReturnType<ReturnType<typeof adminAuth>["verifyIdToken"]>>;
  try {
    decoded = await adminAuth().verifyIdToken(input.idToken);
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
}
