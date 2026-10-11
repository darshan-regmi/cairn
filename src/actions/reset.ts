"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  generateResetToken,
  hashResetToken,
  isResetUsable,
  resetExpiry,
} from "@/lib/reset";
import { completeResetSchema, requestResetSchema } from "@/lib/validation";

export type RequestResetState = {
  success: boolean;
  error?: string;
  /** The relative reset link, offered as a copy-link fallback when no SMTP. */
  resetUrl?: string;
};

// Step 1: ask for a reset link. Always reports success so the form cannot be
// used to probe which email addresses have accounts.
export async function requestPasswordResetAction(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true },
  });
  if (!user) return { success: true };

  const token = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: resetExpiry(),
    },
  });

  const resetUrl = `/reset/${token}`;
  // No SMTP in this build: the server log is the delivery channel, and the
  // form also hands the link back so the requester can copy it themselves.
  console.log(`[password-reset] link for ${user.email}: ${resetUrl}`);
  return { success: true, resetUrl };
}

export type CompleteResetState = {
  success: boolean;
  error?: string;
};

// Step 2: consume the token, set the new password, and retire every other
// outstanding reset link for that account.
export async function completePasswordResetAction(
  _prev: CompleteResetState,
  formData: FormData,
): Promise<CompleteResetState> {
  const parsed = completeResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parsed.data.token) },
  });
  if (!record || !isResetUsable(record)) {
    return {
      success: false,
      error: "This reset link is invalid or has expired.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  redirect("/login?reset=1");
}
