"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import {
  inviteEmailSchema,
  inviteTokenSchema,
  memberIdsSchema,
} from "@/lib/validation";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiry,
  isInviteUsable,
} from "@/lib/invites";

export type InviteActionState = { success: boolean; error?: string; inviteUrl?: string };

/** Owner invites a supervisor. The raw link is returned and shown once. */
export async function createInviteAction(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const projectId = z.string().min(1).safeParse(formData.get("projectId"));
  if (!projectId.success) return { success: false, error: "Missing project." };

  const parsed = inviteEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const owned = await prisma.project.findFirst({
    where: { id: projectId.data, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!owned) return { success: false, error: "Project not found." };

  const [pending, already] = await Promise.all([
    prisma.invite.findFirst({
      where: { projectId: projectId.data, email: parsed.data.email, acceptedAt: null },
      select: { id: true },
    }),
    prisma.projectMember.findFirst({
      where: {
        projectId: projectId.data,
        role: "SUPERVISOR",
        user: { email: parsed.data.email },
      },
      select: { id: true },
    }),
  ]);
  if (pending) {
    return { success: false, error: "This person already has a pending invite." };
  }
  if (already) {
    return { success: false, error: "This person is already a supervisor here." };
  }

  const token = generateInviteToken();
  await prisma.invite.create({
    data: {
      projectId: projectId.data,
      email: parsed.data.email,
      tokenHash: hashInviteToken(token),
      expiresAt: inviteExpiry(),
    },
  });

  return { success: true, inviteUrl: `/invite/${token}` };
}

/** Accept a pending invite: creates a SUPERVISOR membership for the user. */
export async function acceptInviteAction(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const session = await auth();
  if (!session?.user) {
    const token = inviteTokenSchema.safeParse(formData.get("token")).data;
    redirect(token ? `/login?callbackUrl=/invite/${token}` : "/login");
  }

  const parsed = inviteTokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) {
    return { success: false, error: "This invitation link is not valid." };
  }

  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashInviteToken(parsed.data) },
    include: { project: { select: { id: true, title: true } } },
  });
  if (!invite) return { success: false, error: "This invitation link is not valid." };
  if (!isInviteUsable(invite)) {
    return invite.acceptedAt
      ? { success: false, error: "This invitation has already been used." }
      : { success: false, error: "This invitation has expired." };
  }

  const existing = await prisma.projectMember.findFirst({
    where: { projectId: invite.projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    await prisma.projectMember.create({
      data: {
        projectId: invite.projectId,
        userId: session.user.id,
        role: "SUPERVISOR",
      },
    });
  }
  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  redirect("/supervisor");
}

/** Owner removes a supervisor from the project. */
export async function removeSupervisorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = memberIdsSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return;

  const owned = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!owned) return;

  await prisma.projectMember.deleteMany({
    where: {
      projectId: parsed.data.projectId,
      userId: parsed.data.userId,
      role: "SUPERVISOR",
    },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

/** Owner revokes a still-pending invite. */
export async function revokeInviteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const inviteId = z.string().min(1).safeParse(formData.get("inviteId"));
  if (!inviteId.success) return;

  const invite = await prisma.invite.findFirst({
    where: { id: inviteId.data, project: ownerWhere(session.user.id) },
    select: { id: true, projectId: true },
  });
  if (!invite) return;

  await prisma.invite.delete({ where: { id: invite.id } });
  revalidatePath(`/projects/${invite.projectId}`);
}