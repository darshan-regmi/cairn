"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import { revokeShareLinkSchema, saveShareLinkSchema } from "@/lib/validation";
import { generateShareToken } from "@/lib/share";

export type ShareActionState = { success: boolean; error?: string };

/**
 * Creates the project's read-only link if it has none, and (re)sets its expiry.
 * Owner only: the link hands out access, so only the owner decides on it.
 */
export async function saveShareLinkAction(
  _prev: ShareActionState,
  formData: FormData,
): Promise<ShareActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = saveShareLinkSchema.safeParse({
    projectId: formData.get("projectId"),
    // An empty date input means "no expiry".
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  if (parsed.data.expiresAt && parsed.data.expiresAt.getTime() <= Date.now()) {
    return {
      success: false,
      error: "Pick a future date, or leave it empty for no expiry.",
    };
  }

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true, shareToken: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  await prisma.project.update({
    where: { id: project.id },
    data: {
      // Keep the existing token so the URL does not change when only the
      // expiry is edited.
      shareToken: project.shareToken ?? generateShareToken(),
      shareExpiresAt: parsed.data.expiresAt,
    },
  });

  revalidatePath(`/projects/${project.id}`);
  return { success: true };
}

/** Revokes the link: the token and expiry are cleared, killing any URL. */
export async function revokeShareLinkAction(
  _prev: ShareActionState,
  formData: FormData,
): Promise<ShareActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = revokeShareLinkSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) return { success: false, error: "Missing project." };

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  await prisma.project.update({
    where: { id: project.id },
    data: { shareToken: null, shareExpiresAt: null },
  });

  revalidatePath(`/projects/${project.id}`);
  return { success: true };
}
