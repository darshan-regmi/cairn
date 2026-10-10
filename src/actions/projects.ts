"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createMilestoneSchema,
  createProjectSchema,
  milestoneStatusSchema,
} from "@/lib/validation";

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
      ownerId: session.user.id,
      startDate: new Date(`${parsed.data.startDate}T00:00:00`),
      endDate: new Date(`${parsed.data.endDate}T00:00:00`),
    },
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
    where: { id: projectId.data, ownerId: session.user.id },
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
      project: { ownerId: session.user.id },
    },
  });
  if (!milestone) return;

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: parsed.data.status },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
}