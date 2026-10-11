"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import {
  createDeliverableSchema,
  deleteDeliverableSchema,
  toggleDeliverableSchema,
  updateDeliverableSchema,
} from "@/lib/validation";

export type DeliverableActionState = { success: boolean; error?: string };

function revalidateDeliverable(projectId: string, milestoneId: string) {
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

/** A deliverable must belong to a milestone in a project the user owns. */
function findOwnedDeliverable(deliverableId: string, userId: string) {
  return prisma.deliverable.findFirst({
    where: { id: deliverableId, milestone: { project: ownerWhere(userId) } },
    select: {
      id: true,
      milestoneId: true,
      milestone: { select: { projectId: true } },
    },
  });
}

export async function createDeliverableAction(
  _prev: DeliverableActionState,
  formData: FormData,
): Promise<DeliverableActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = createDeliverableSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
    title: formData.get("title"),
    url: formData.get("url") || undefined,
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

  const { _max } = await prisma.deliverable.aggregate({
    where: { milestoneId: milestone.id },
    _max: { order: true },
  });

  await prisma.deliverable.create({
    data: {
      milestoneId: milestone.id,
      title: parsed.data.title,
      url: parsed.data.url,
      order: (_max.order ?? -1) + 1,
    },
  });

  revalidateDeliverable(milestone.projectId, milestone.id);
  return { success: true };
}

export async function updateDeliverableAction(
  _prev: DeliverableActionState,
  formData: FormData,
): Promise<DeliverableActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = updateDeliverableSchema.safeParse({
    deliverableId: formData.get("deliverableId"),
    title: formData.get("title"),
    url: formData.get("url") || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const deliverable = await findOwnedDeliverable(
    parsed.data.deliverableId,
    session.user.id,
  );
  if (!deliverable) return { success: false, error: "Deliverable not found." };

  await prisma.deliverable.update({
    where: { id: deliverable.id },
    data: { title: parsed.data.title, url: parsed.data.url },
  });

  revalidateDeliverable(deliverable.milestone.projectId, deliverable.milestoneId);
  return { success: true };
}

export async function toggleDeliverableAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = toggleDeliverableSchema.safeParse({
    deliverableId: formData.get("deliverableId"),
    done: formData.get("done"),
  });
  if (!parsed.success) return;

  const deliverable = await findOwnedDeliverable(
    parsed.data.deliverableId,
    session.user.id,
  );
  if (!deliverable) return;

  await prisma.deliverable.update({
    where: { id: deliverable.id },
    data: { doneAt: parsed.data.done === "true" ? new Date() : null },
  });

  revalidateDeliverable(deliverable.milestone.projectId, deliverable.milestoneId);
}

export async function deleteDeliverableAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = deleteDeliverableSchema.safeParse({
    deliverableId: formData.get("deliverableId"),
  });
  if (!parsed.success) return;

  const deliverable = await findOwnedDeliverable(
    parsed.data.deliverableId,
    session.user.id,
  );
  if (!deliverable) return;

  await prisma.deliverable.delete({ where: { id: deliverable.id } });
  revalidateDeliverable(deliverable.milestone.projectId, deliverable.milestoneId);
}
