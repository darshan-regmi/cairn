"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import {
  createMilestoneSchema,
  createProjectSchema,
  importProjectSchema,
  milestoneStatusSchema,
  saveMilestoneDetailsSchema,
} from "@/lib/validation";
import { parseProjectCsv } from "@/lib/csv-import";

export type ProjectActionState = { success: boolean; error?: string };

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = createProjectSchema.safeParse({
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const project = await prisma.project.create({
    data: {
      title: parsed.data.title,
      startDate: new Date(`${parsed.data.startDate}T00:00:00`),
      endDate: new Date(`${parsed.data.endDate}T00:00:00`),
      members: { create: { userId: session.user.id, role: "OWNER" } },
    },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function importProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Choose a CSV file to import." };
  }
  if (file.size > 2_000_000) {
    return { success: false, error: "File is too large (limit 2 MB)." };
  }

  const text = await file.text();
  const parsed = parseProjectCsv(text);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const validated = importProjectSchema.safeParse(parsed.project);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "The file did not validate.",
    };
  }
  const plan = validated.data;

  // A file is one project; importing the same one twice would duplicate the
  // whole timeline, so refuse exact title + date matches for this user.
  const duplicate = await prisma.project.findFirst({
    where: {
      ...ownerWhere(session.user.id),
      title: plan.title,
      startDate: new Date(`${plan.startDate}T00:00:00`),
      endDate: new Date(`${plan.endDate}T00:00:00`),
    },
    select: { id: true },
  });
  if (duplicate) {
    return {
      success: false,
      error: `A project titled "${plan.title}" with these dates already exists — importing the same file twice would duplicate the timeline.`,
    };
  }

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        title: plan.title,
        goal: plan.goal ?? null,
        startDate: new Date(`${plan.startDate}T00:00:00`),
        endDate: new Date(`${plan.endDate}T00:00:00`),
        members: { create: { userId: session.user.id, role: "OWNER" } },
      },
    });
    for (const [milestoneIndex, milestone] of plan.milestones.entries()) {
      const createdMilestone = await tx.milestone.create({
        data: {
          name: milestone.name,
          goal: milestone.goal ?? null,
          projectId: created.id,
          plannedStart: new Date(`${milestone.plannedStart}T00:00:00`),
          plannedEnd: new Date(`${milestone.plannedEnd}T00:00:00`),
          order: milestoneIndex,
        },
      });
      for (const [taskIndex, task] of milestone.tasks.entries()) {
        await tx.task.create({
          data: {
            title: task.title,
            milestoneId: createdMilestone.id,
            status: "TODO",
            priority: "MEDIUM",
            due: new Date(`${task.due}T00:00:00`),
            notes: task.notes ?? null,
            order: taskIndex,
          },
        });
      }
    }
    return created;
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function createMilestoneAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const projectId = z.string().min(1).safeParse(formData.get("projectId"));
  if (!projectId.success) return { success: false, error: "Missing project." };

  const parsed = createMilestoneSchema.safeParse({
    name: formData.get("name"),
    plannedStart: formData.get("plannedStart"),
    plannedEnd: formData.get("plannedEnd"),
    goal: formData.get("goal"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const owned = await prisma.project.findFirst({
    where: { id: projectId.data, ...ownerWhere(session.user.id) },
  });
  if (!owned) return { success: false, error: "Project not found." };

  const { _max } = await prisma.milestone.aggregate({
    where: { projectId: projectId.data },
    _max: { order: true },
  });

  await prisma.milestone.create({
    data: {
      name: parsed.data.name,
      projectId: projectId.data,
      plannedStart: new Date(`${parsed.data.plannedStart}T00:00:00`),
      plannedEnd: new Date(`${parsed.data.plannedEnd}T00:00:00`),
      goal: parsed.data.goal || null,
      order: (_max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${projectId.data}`);
  return { success: true };
}

export async function updateMilestoneStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = z
    .object({ milestoneId: z.string().min(1), status: milestoneStatusSchema })
    .safeParse({
      milestoneId: formData.get("milestoneId"),
      status: formData.get("status"),
    });
  if (!parsed.success) return;

  const milestone = await prisma.milestone.findFirst({
    where: {
      id: parsed.data.milestoneId,
      project: ownerWhere(session.user.id),
    },
  });
  if (!milestone) return;

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: parsed.data.status },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
}

/** Save the milestone's scope and definition of done (either may be blank). */
export async function saveMilestoneDetailsAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = saveMilestoneDetailsSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
    scope: formData.get("scope"),
    definitionOfDone: formData.get("definitionOfDone"),
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
      project: ownerWhere(session.user.id),
    },
    select: { id: true, projectId: true },
  });
  if (!milestone) return { success: false, error: "Milestone not found." };

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      scope: parsed.data.scope,
      definitionOfDone: parsed.data.definitionOfDone,
    },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath(`/projects/${milestone.projectId}/milestones/${milestone.id}`);
  revalidatePath(`/supervisor/${milestone.projectId}`);
  return { success: true };
}