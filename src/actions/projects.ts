"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import { canOwnProjects } from "@/lib/roles";
import {
  createMilestoneSchema,
  createProjectSchema,
  deleteMilestoneSchema,
  importProjectSchema,
  milestoneStatusSchema,
  projectIdSchema,
  saveMilestoneDetailsSchema,
  updateMilestoneSchema,
  updateProjectSchema,
} from "@/lib/validation";
import { parseProjectCsv } from "@/lib/csv-import";

export type ProjectActionState = {
  success: boolean;
  error?: string;
  /** Set on success so the caller can navigate without a server redirect. */
  projectId?: string;
};

/** Refresh every page that lists projects, so a change shows up everywhere. */
function revalidateProjectLists(projectId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };
  if (!canOwnProjects(session.user.role)) {
    return { success: false, error: "Supervisor accounts cannot create projects." };
  }

  const parsed = createProjectSchema.safeParse({
    title: formData.get("title"),
    goal: formData.get("goal"),
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
      goal: parsed.data.goal,
      startDate: new Date(`${parsed.data.startDate}T00:00:00`),
      endDate: new Date(`${parsed.data.endDate}T00:00:00`),
      members: { create: { userId: session.user.id, role: "OWNER" } },
    },
  });

  revalidateProjectLists();
  return { success: true, projectId: project.id };
}

export async function importProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };
  if (!canOwnProjects(session.user.role)) {
    return { success: false, error: "Supervisor accounts cannot create projects." };
  }

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

  revalidateProjectLists();
  return { success: true, projectId: project.id };
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

/**
 * Move a milestone one place up or down. The whole project is re-numbered
 * 0..n-1 in one transaction so gaps and swaps never violate the
 * @@unique([projectId, order]) constraint (orders go negative first, then to
 * their final values).
 */
export async function moveMilestoneAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = z
    .object({
      milestoneId: z.string().min(1),
      direction: z.enum(["up", "down"]),
    })
    .safeParse({
      milestoneId: formData.get("milestoneId"),
      direction: formData.get("direction"),
    });
  if (!parsed.success) return;

  const milestone = await prisma.milestone.findFirst({
    where: { id: parsed.data.milestoneId, project: ownerWhere(session.user.id) },
    select: { id: true, projectId: true },
  });
  if (!milestone) return;

  const siblings = await prisma.milestone.findMany({
    where: { projectId: milestone.projectId },
    orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
    select: { id: true },
  });

  const current = siblings.findIndex((sibling) => sibling.id === milestone.id);
  const target = parsed.data.direction === "up" ? current - 1 : current + 1;
  if (current === -1 || target < 0 || target >= siblings.length) return;

  const reordered = [...siblings];
  [reordered[current], reordered[target]] = [
    reordered[target],
    reordered[current],
  ];

  await prisma.$transaction(async (tx) => {
    for (const [index, sibling] of reordered.entries()) {
      await tx.milestone.update({
        where: { id: sibling.id },
        data: { order: -(index + 1) },
      });
    }
    for (const [index, sibling] of reordered.entries()) {
      await tx.milestone.update({
        where: { id: sibling.id },
        data: { order: index },
      });
    }
  });

  revalidatePath(`/projects/${milestone.projectId}`);
}

/** Refresh the project page, the board, and the supervisor's read-only view. */
function revalidateMilestone(projectId: string, milestoneId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath(`/supervisor/${projectId}`);
  revalidateProjectLists(projectId);
}

/** Edit a milestone's name, goal and planned dates without touching its tasks. */
export async function updateMilestoneAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = updateMilestoneSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
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

  const milestone = await prisma.milestone.findFirst({
    where: { id: parsed.data.milestoneId, project: ownerWhere(session.user.id) },
    select: { id: true, projectId: true },
  });
  if (!milestone) return { success: false, error: "Milestone not found." };

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      name: parsed.data.name,
      goal: parsed.data.goal,
      plannedStart: new Date(`${parsed.data.plannedStart}T00:00:00`),
      plannedEnd: new Date(`${parsed.data.plannedEnd}T00:00:00`),
    },
  });

  revalidateMilestone(milestone.projectId, milestone.id);
  return { success: true };
}

/** Delete a milestone and everything hanging off it (tasks, review, notes). */
export async function deleteMilestoneAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = deleteMilestoneSchema.safeParse({
    milestoneId: formData.get("milestoneId"),
  });
  if (!parsed.success) return;

  const milestone = await prisma.milestone.findFirst({
    where: { id: parsed.data.milestoneId, project: ownerWhere(session.user.id) },
    select: { id: true, projectId: true },
  });
  if (!milestone) return;

  await prisma.milestone.delete({ where: { id: milestone.id } });
  revalidateMilestone(milestone.projectId, milestone.id);
}

/** Edit a project's title, goal and dates. Owner only. */
export async function updateProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    goal: formData.get("goal"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!project) return { success: false, error: "Project not found." };

  await prisma.project.update({
    where: { id: project.id },
    data: {
      title: parsed.data.title,
      goal: parsed.data.goal,
      startDate: new Date(`${parsed.data.startDate}T00:00:00`),
      endDate: new Date(`${parsed.data.endDate}T00:00:00`),
    },
  });

  revalidateProjectLists(project.id);
  revalidatePath(`/supervisor/${project.id}`);
  return { success: true };
}

/**
 * Complete a project: it leaves the dashboard and joins the archive. This is
 * the only way a project is archived — there is no manual archive step.
 */
export async function completeProjectAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = projectIdSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) return;

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!project) return;

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "COMPLETE", completedAt: new Date() },
  });

  revalidateProjectLists(project.id);
  revalidatePath(`/supervisor/${project.id}`);
}

/** Reopen a completed project so it is active again. Owner only. */
export async function reopenProjectAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = projectIdSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) return;

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!project) return;

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "IN_PROGRESS", completedAt: null },
  });

  revalidateProjectLists(project.id);
  revalidatePath(`/supervisor/${project.id}`);
}

/** Delete a project and everything in it. Owner only, permanent. */
export async function deleteProjectAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = projectIdSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) return;

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!project) return;

  await prisma.project.delete({ where: { id: project.id } });
  revalidateProjectLists();
  redirect("/projects");
}