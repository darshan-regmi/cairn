"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import { MAX_ACTION_LINES, parseActionLines } from "@/lib/meetings";
import {
  addMeetingTaskSchema,
  convertMeetingTaskSchema,
  createMeetingSchema,
  deleteMeetingSchema,
  deleteMeetingTaskSchema,
  updateMeetingSchema,
} from "@/lib/validation";

export type MeetingActionState = { success: boolean; error?: string };

function revalidateMeetings(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/meetings`);
}

/** Meeting must live in a project the signed-in user owns. */
function findOwnedMeeting(meetingId: string, userId: string) {
  return prisma.meeting.findFirst({
    where: { id: meetingId, project: ownerWhere(userId) },
    select: { id: true, projectId: true, milestoneId: true },
  });
}

/** The milestone must sit in this project (meetings and tasks both link to it). */
function findMilestoneInProject(milestoneId: string, projectId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true },
  });
}

export async function createMeetingAction(
  _prev: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = createMeetingSchema.safeParse({
    projectId: formData.get("projectId"),
    milestoneId: formData.get("milestoneId") || undefined,
    date: formData.get("date"),
    nextMeetingDate: formData.get("nextMeetingDate") || undefined,
    itemsDiscussed: formData.get("itemsDiscussed") ?? undefined,
    achievements: formData.get("achievements") ?? undefined,
    problems: formData.get("problems") ?? undefined,
    actionItems: formData.get("actionItems") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const owned = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ...ownerWhere(session.user.id) },
    select: { id: true },
  });
  if (!owned) return { success: false, error: "Project not found." };

  if (
    parsed.data.milestoneId &&
    !(await findMilestoneInProject(parsed.data.milestoneId, owned.id))
  ) {
    return { success: false, error: "Milestone not found." };
  }

  const lines = parseActionLines(parsed.data.actionItems);
  await prisma.meeting.create({
    data: {
      projectId: owned.id,
      milestoneId: parsed.data.milestoneId ?? null,
      date: new Date(`${parsed.data.date}T00:00:00`),
      nextMeetingDate: parsed.data.nextMeetingDate
        ? new Date(`${parsed.data.nextMeetingDate}T00:00:00`)
        : null,
      itemsDiscussed: parsed.data.itemsDiscussed,
      achievements: parsed.data.achievements,
      problems: parsed.data.problems,
      actionItems: { create: lines.map((text) => ({ text })) },
    },
  });

  revalidateMeetings(owned.id);
  return { success: true };
}

export async function updateMeetingAction(
  _prev: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = updateMeetingSchema.safeParse({
    meetingId: formData.get("meetingId"),
    milestoneId: formData.get("milestoneId") || undefined,
    date: formData.get("date"),
    nextMeetingDate: formData.get("nextMeetingDate") || undefined,
    itemsDiscussed: formData.get("itemsDiscussed") ?? undefined,
    achievements: formData.get("achievements") ?? undefined,
    problems: formData.get("problems") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const meeting = await findOwnedMeeting(parsed.data.meetingId, session.user.id);
  if (!meeting) return { success: false, error: "Meeting not found." };

  if (
    parsed.data.milestoneId &&
    !(await findMilestoneInProject(parsed.data.milestoneId, meeting.projectId))
  ) {
    return { success: false, error: "Milestone not found." };
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      milestoneId: parsed.data.milestoneId ?? null,
      date: new Date(`${parsed.data.date}T00:00:00`),
      nextMeetingDate: parsed.data.nextMeetingDate
        ? new Date(`${parsed.data.nextMeetingDate}T00:00:00`)
        : null,
      itemsDiscussed: parsed.data.itemsDiscussed,
      achievements: parsed.data.achievements,
      problems: parsed.data.problems,
    },
  });

  revalidateMeetings(meeting.projectId);
  return { success: true };
}

export async function deleteMeetingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = deleteMeetingSchema.safeParse({
    meetingId: formData.get("meetingId"),
  });
  if (!parsed.success) return;

  const meeting = await findOwnedMeeting(parsed.data.meetingId, session.user.id);
  if (!meeting) return;

  // Action lines cascade away; cards already converted stay on the board.
  await prisma.meeting.delete({ where: { id: meeting.id } });
  revalidateMeetings(meeting.projectId);
}

export async function addMeetingTaskAction(
  _prev: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = addMeetingTaskSchema.safeParse({
    meetingId: formData.get("meetingId"),
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const meeting = await findOwnedMeeting(parsed.data.meetingId, session.user.id);
  if (!meeting) return { success: false, error: "Meeting not found." };

  const count = await prisma.meetingTask.count({
    where: { meetingId: meeting.id },
  });
  if (count >= MAX_ACTION_LINES) {
    return {
      success: false,
      error: `A meeting can hold up to ${MAX_ACTION_LINES} actions.`,
    };
  }

  await prisma.meetingTask.create({
    data: { meetingId: meeting.id, text: parsed.data.text },
  });

  revalidateMeetings(meeting.projectId);
  return { success: true };
}

export async function deleteMeetingTaskAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = deleteMeetingTaskSchema.safeParse({
    meetingTaskId: formData.get("meetingTaskId"),
  });
  if (!parsed.success) return;

  const item = await prisma.meetingTask.findFirst({
    where: {
      id: parsed.data.meetingTaskId,
      meeting: { project: ownerWhere(session.user.id) },
    },
    select: {
      id: true,
      taskId: true,
      meeting: { select: { projectId: true } },
    },
  });
  // A converted line is the origin of a real card, so it can't be removed.
  if (!item || item.taskId) return;

  await prisma.meetingTask.delete({ where: { id: item.id } });
  revalidateMeetings(item.meeting.projectId);
}

/**
 * One-click "agreed action -> kanban card": create a task on the meeting's
 * milestone (or the chosen one) and link the action line to it.
 */
export async function convertMeetingTaskAction(
  _prev: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = convertMeetingTaskSchema.safeParse({
    meetingTaskId: formData.get("meetingTaskId"),
    milestoneId: formData.get("milestoneId"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const item = await prisma.meetingTask.findFirst({
    where: {
      id: parsed.data.meetingTaskId,
      meeting: { project: ownerWhere(session.user.id) },
    },
    select: {
      id: true,
      text: true,
      taskId: true,
      meetingId: true,
      meeting: { select: { projectId: true } },
    },
  });
  if (!item) return { success: false, error: "Action not found." };
  if (item.taskId) {
    return { success: false, error: "This action is already on the board." };
  }

  const milestone = await findMilestoneInProject(
    parsed.data.milestoneId,
    item.meeting.projectId,
  );
  if (!milestone) return { success: false, error: "Milestone not found." };

  await prisma.$transaction(async (tx) => {
    const { _max } = await tx.task.aggregate({
      where: { milestoneId: milestone.id, status: "TODO" },
      _max: { order: true },
    });
    const task = await tx.task.create({
      data: {
        milestoneId: milestone.id,
        title: item.text.slice(0, 200),
        status: "TODO",
        priority: "MEDIUM",
        source: "MEETING",
        sourceMeetingId: item.meetingId,
        order: (_max.order ?? -1) + 1,
      },
      select: { id: true },
    });
    await tx.meetingTask.update({
      where: { id: item.id },
      data: { taskId: task.id },
    });
  });

  revalidatePath(`/projects/${item.meeting.projectId}/milestones/${milestone.id}`);
  revalidateMeetings(item.meeting.projectId);
  return { success: true };
}
