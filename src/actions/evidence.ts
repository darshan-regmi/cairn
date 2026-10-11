"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import {
  createEvidenceSchema,
  deleteEvidenceSchema,
  updateEvidenceSchema,
} from "@/lib/validation";

export type EvidenceActionState = { success: boolean; error?: string };

function revalidateEvidence(projectId: string, milestoneId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath(`/supervisor/${projectId}`);
}

/** The milestone must sit in a project the signed-in user owns. */
function findOwnedMilestone(milestoneId: string, userId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, project: ownerWhere(userId) },
    select: { id: true, projectId: true },
  });
}

/** Evidence must belong to a milestone in a project the user owns. */
function findOwnedEvidence(evidenceId: string, userId: string) {
  return prisma.evidence.findFirst({
    where: { id: evidenceId, milestone: { project: ownerWhere(userId) } },
    select: {
      id: true,
      milestoneId: true,
      milestone: { select: { projectId: true } },
    },
  });
}

export async function createEvidenceAction(
  _prev: EvidenceActionState,
  formData: FormData,
): Promise<EvidenceActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = createEvidenceSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
    title: formData.get("title"),
    date: formData.get("date"),
    type: formData.get("type"),
    url: formData.get("url") || undefined,
    whatItProves: formData.get("whatItProves") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const milestone = await findOwnedMilestone(
    parsed.data.milestoneId,
    session.user.id,
  );
  if (!milestone) return { success: false, error: "Milestone not found." };

  await prisma.evidence.create({
    data: {
      milestoneId: milestone.id,
      title: parsed.data.title,
      date: new Date(`${parsed.data.date}T00:00:00`),
      type: parsed.data.type,
      url: parsed.data.url,
      whatItProves: parsed.data.whatItProves,
    },
  });

  revalidateEvidence(milestone.projectId, milestone.id);
  return { success: true };
}

export async function updateEvidenceAction(
  _prev: EvidenceActionState,
  formData: FormData,
): Promise<EvidenceActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = updateEvidenceSchema.safeParse({
    evidenceId: formData.get("evidenceId"),
    title: formData.get("title"),
    date: formData.get("date"),
    type: formData.get("type"),
    url: formData.get("url") || undefined,
    whatItProves: formData.get("whatItProves") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const evidence = await findOwnedEvidence(
    parsed.data.evidenceId,
    session.user.id,
  );
  if (!evidence) return { success: false, error: "Evidence not found." };

  await prisma.evidence.update({
    where: { id: evidence.id },
    data: {
      title: parsed.data.title,
      date: new Date(`${parsed.data.date}T00:00:00`),
      type: parsed.data.type,
      url: parsed.data.url,
      whatItProves: parsed.data.whatItProves,
    },
  });

  revalidateEvidence(evidence.milestone.projectId, evidence.milestoneId);
  return { success: true };
}

export async function deleteEvidenceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = deleteEvidenceSchema.safeParse({
    evidenceId: formData.get("evidenceId"),
  });
  if (!parsed.success) return;

  const evidence = await findOwnedEvidence(
    parsed.data.evidenceId,
    session.user.id,
  );
  if (!evidence) return;

  await prisma.evidence.delete({ where: { id: evidence.id } });
  revalidateEvidence(evidence.milestone.projectId, evidence.milestoneId);
}
