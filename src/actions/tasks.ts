"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteTaskSchema,
  moveTasksSchema,
  saveTaskSchema,
} from "@/lib/validation";

export type TaskActionState = { success: boolean; error?: string };

function revalidateMilestone(projectId: string, milestoneId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
}

/** Create a task, or update an existing one when taskId is present. */
export async function saveTaskAction(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = saveTaskSchema.safeParse({
    taskId: formData.get("taskId") ?? undefined,
    milestoneId: formData.get("milestoneId"),
    title: formData.get("title"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    due: formData.get("due") || undefined,
    notes: formData.get("notes") ?? undefined,
    commit: formData.get("commit") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const milestone = await prisma.milestone.findFirst({
    where: {
      id: parsed.data.milestoneId,
      project: { ownerId: session.user.id },
    },
    select: { id: true, projectId: true },
  });
  if (!milestone) return { success: false, error: "Milestone not found." };

  const data = {
    title: parsed.data.title,
    status: parsed.data.status,
    priority: parsed.data.priority,
    due: parsed.data.due,
    notes: parsed.data.notes || null,
    commit: parsed.data.commit || null,
  };

  if (parsed.data.taskId) {
    const existing = await prisma.task.findFirst({
      where: { id: parsed.data.taskId, milestoneId: milestone.id },
    });
    if (!existing) return { success: false, error: "Task not found." };
    await prisma.task.update({ where: { id: existing.id }, data });
  } else {
    const { _max } = await prisma.task.aggregate({
      where: { milestoneId: milestone.id, status: parsed.data.status },
      _max: { order: true },
    });
    await prisma.task.create({
      data: { milestoneId: milestone.id, order: (_max.order ?? -1) + 1, ...data },
    });
  }

  revalidateMilestone(milestone.projectId, milestone.id);
  return { success: true };
}

export async function deleteTaskAction(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = deleteTaskSchema.safeParse({
    taskId: formData.get("taskId"),
  });
  if (!parsed.success) return { success: false, error: "Invalid input." };

  const task = await prisma.task.findFirst({
    where: { id: parsed.data.taskId, milestone: { project: { ownerId: session.user.id } } },
    include: { milestone: true },
  });
  if (!task) return { success: false, error: "Task not found." };

  await prisma.task.delete({ where: { id: task.id } });
  revalidateMilestone(task.milestone.projectId, task.milestone.id);
  return { success: true };
}

/**
 * Persist the whole board after a drag: each column provides its ordered
 * task ids, and the action writes status + order in one transaction after
 * verifying every id belongs to this milestone.
 */
export async function moveTasksAction(input: unknown) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = moveTasksSchema.safeParse(input);
  if (!parsed.success) return;

  const milestone = await prisma.milestone.findFirst({
    where: {
      id: parsed.data.milestoneId,
      project: { ownerId: session.user.id },
    },
    select: { id: true, projectId: true },
  });
  if (!milestone) return;

  const existingIds = await prisma.task
    .findMany({ where: { milestoneId: milestone.id }, select: { id: true } })
    .then((tasks) => tasks.map((t) => t.id));

  const offeredIds = parsed.data.columns.flatMap((column) => column.taskIds);
  const hasDuplicates = offeredIds.length !== new Set(offeredIds).size;
  const coversEverything =
    offeredIds.length === existingIds.length &&
    offeredIds.every((id) => existingIds.includes(id));
  if (hasDuplicates || !coversEverything) return;

  const updates = parsed.data.columns.flatMap((column) =>
    column.taskIds.map((id, order) => ({ id, status: column.status, order })),
  );

  await prisma.$transaction(
    updates.map((update) =>
      prisma.task.update({
        where: { id: update.id },
        data: { status: update.status, order: update.order },
      }),
    ),
  );

  revalidateMilestone(milestone.projectId, milestone.id);
}