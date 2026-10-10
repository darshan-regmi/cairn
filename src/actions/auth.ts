"use server";

import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validation";

export type SignUpState = {
  success: boolean;
  error?: string;
};

// Server action = the only path for creating an account. All input re-validated
// with Zod here; nothing from the client is trusted as-is.
export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const name =
    parsed.data.name && parsed.data.name.length > 0
      ? parsed.data.name
      : undefined;

  const email = parsed.data.email;
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await prisma.user.create({ data: { email, name, passwordHash } });
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