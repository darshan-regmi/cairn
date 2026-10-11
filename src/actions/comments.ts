"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { memberWhere } from "@/lib/access";
import {
  createCommentSchema,
  deleteCommentSchema,
  updateCommentSchema,
  type CommentTarget,
} from "@/lib/validation";

export type CommentActionState = { success: boolean; error?: string };

// Every comment targets one item (milestone, task, meeting, ...) that lives
// under a project. Resolving the target also proves it still exists.
async function targetProjectId(targetType: CommentTarget, targetId: string) {
  switch (targetType) {
    case "MILESTONE": {
      const row = await prisma.milestone.findUnique({
        where: { id: targetId },
        select: { projectId: true },
      });
      return row?.projectId ?? null;
    }
    case "TASK": {
      const row = await prisma.task.findUnique({
        where: { id: targetId },
        include: { milestone: { select: { projectId: true } } },
      });
      return row?.milestone.projectId ?? null;
    }
    case "MEETING": {
      const row = await prisma.meeting.findUnique({
        where: { id: targetId },
        select: { projectId: true },
      });
      return row?.projectId ?? null;
    }
    case "QUESTION": {
      const row = await prisma.question.findUnique({
        where: { id: targetId },
        select: { projectId: true },
      });
      return row?.projectId ?? null;
    }
    case "REVIEW": {
      const row = await prisma.review.findUnique({
        where: { id: targetId },
        include: { milestone: { select: { projectId: true } } },
      });
      return row?.milestone.projectId ?? null;
    }
    case "EVIDENCE": {
      const row = await prisma.evidence.findUnique({
        where: { id: targetId },
        include: { milestone: { select: { projectId: true } } },
      });
      return row?.milestone.projectId ?? null;
    }
  }
}

/** Any member of the target's project may comment (owner or supervisor). */
export async function createCommentAction(
  _prev: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = createCommentSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid comment.",
    };
  }

  const projectId = await targetProjectId(parsed.data.targetType, parsed.data.targetId);
  if (!projectId) return { success: false, error: "Comment target not found." };

  const member = await prisma.project.findFirst({
    where: { id: projectId, ...memberWhere(session.user.id) },
    select: { id: true },
  });
  if (!member) return { success: false, error: "No access to this project." };

  await prisma.comment.create({
    data: {
      projectId,
      authorId: session.user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      body: parsed.data.body,
    },
  });

  return { success: true };
}

/** Only the author may edit; they must still be a member of the project. */
export async function updateCommentAction(
  _prev: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = updateCommentSchema.safeParse({
    commentId: formData.get("commentId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid comment.",
    };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.data.commentId },
    select: { id: true, authorId: true, projectId: true },
  });
  if (!comment || comment.authorId !== session.user.id) {
    return { success: false, error: "Comment not found." };
  }

  const member = await prisma.project.findFirst({
    where: { id: comment.projectId, ...memberWhere(session.user.id) },
    select: { id: true },
  });
  if (!member) return { success: false, error: "No access to this project." };

  await prisma.comment.update({
    where: { id: comment.id },
    data: { body: parsed.data.body, editedAt: new Date() },
  });

  return { success: true };
}

/** Only the author may delete their own comment. */
export async function deleteCommentAction(
  _prev: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = deleteCommentSchema.safeParse({ commentId: formData.get("commentId") });
  if (!parsed.success) return { success: false, error: "Invalid comment." };

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.data.commentId },
    select: { id: true, authorId: true },
  });
  if (!comment || comment.authorId !== session.user.id) {
    return { success: false, error: "Comment not found." };
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  return { success: true };
}