"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import { deleteReviewSchema, saveReviewSchema } from "@/lib/validation";

export type ReviewActionState = { success: boolean; error?: string };

function revalidateReview(projectId: string, milestoneId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath(`/supervisor/${projectId}`);
}

/** Milestone must live in a project the signed-in user owns. */
function findOwnedMilestone(milestoneId: string, userId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, project: ownerWhere(userId) },
    select: { id: true, projectId: true },
  });
}

/** Create the milestone's review, or update it if one already exists. */
export async function saveReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = saveReviewSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
    date: formData.get("date"),
    verdict: formData.get("verdict"),
    askedFor: formData.get("askedFor") ?? undefined,
    demonstrated: formData.get("demonstrated") ?? undefined,
    promised: formData.get("promised") ?? undefined,
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

  const data = {
    date: new Date(`${parsed.data.date}T00:00:00`),
    verdict: parsed.data.verdict,
    askedFor: parsed.data.askedFor,
    demonstrated: parsed.data.demonstrated,
    promised: parsed.data.promised,
  };

  await prisma.review.upsert({
    where: { milestoneId: milestone.id },
    create: { milestoneId: milestone.id, ...data },
    update: data,
  });

  revalidateReview(milestone.projectId, milestone.id);
  return { success: true };
}

export async function deleteReviewAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = deleteReviewSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
  });
  if (!parsed.success) return;

  const milestone = await findOwnedMilestone(
    parsed.data.milestoneId,
    session.user.id,
  );
  if (!milestone) return;

  await prisma.review.deleteMany({ where: { milestoneId: milestone.id } });
  revalidateReview(milestone.projectId, milestone.id);
}
