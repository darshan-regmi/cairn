"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import {
  adoptQuestionSchema,
  createQuestionSchema,
  deleteQuestionSchema,
  setQuestionStatusSchema,
  updateQuestionSchema,
} from "@/lib/validation";

export type QuestionActionState = { success: boolean; error?: string };

function revalidateQuestions(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/questions`);
}

/** Question must live in a project the signed-in user owns. */
function findOwnedQuestion(questionId: string, userId: string) {
  return prisma.question.findFirst({
    where: { id: questionId, project: ownerWhere(userId) },
    select: { id: true, projectId: true, milestoneId: true, decidedAt: true },
  });
}

/** The milestone must sit in this project (questions and tasks both link to it). */
function findMilestoneInProject(milestoneId: string, projectId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, projectId },
    select: { id: true },
  });
}

export async function createQuestionAction(
  _prev: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = createQuestionSchema.safeParse({
    projectId: formData.get("projectId"),
    milestoneId: formData.get("milestoneId") || undefined,
    title: formData.get("title"),
    context: formData.get("context") ?? undefined,
    ifWeDoIt: formData.get("ifWeDoIt") ?? undefined,
    whatItCosts: formData.get("whatItCosts") ?? undefined,
    ifWeDont: formData.get("ifWeDont") ?? undefined,
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

  await prisma.question.create({
    data: {
      projectId: owned.id,
      milestoneId: parsed.data.milestoneId ?? null,
      title: parsed.data.title,
      context: parsed.data.context,
      ifWeDoIt: parsed.data.ifWeDoIt,
      whatItCosts: parsed.data.whatItCosts,
      ifWeDont: parsed.data.ifWeDont,
    },
  });

  revalidateQuestions(owned.id);
  return { success: true };
}

export async function updateQuestionAction(
  _prev: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = updateQuestionSchema.safeParse({
    questionId: formData.get("questionId"),
    milestoneId: formData.get("milestoneId") || undefined,
    title: formData.get("title"),
    context: formData.get("context") ?? undefined,
    ifWeDoIt: formData.get("ifWeDoIt") ?? undefined,
    whatItCosts: formData.get("whatItCosts") ?? undefined,
    ifWeDont: formData.get("ifWeDont") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const question = await findOwnedQuestion(
    parsed.data.questionId,
    session.user.id,
  );
  if (!question) return { success: false, error: "Question not found." };

  if (
    parsed.data.milestoneId &&
    !(await findMilestoneInProject(parsed.data.milestoneId, question.projectId))
  ) {
    return { success: false, error: "Milestone not found." };
  }

  await prisma.question.update({
    where: { id: question.id },
    data: {
      milestoneId: parsed.data.milestoneId ?? null,
      title: parsed.data.title,
      context: parsed.data.context,
      ifWeDoIt: parsed.data.ifWeDoIt,
      whatItCosts: parsed.data.whatItCosts,
      ifWeDont: parsed.data.ifWeDont,
    },
  });

  revalidateQuestions(question.projectId);
  return { success: true };
}

export async function deleteQuestionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = deleteQuestionSchema.safeParse({
    questionId: formData.get("questionId"),
  });
  if (!parsed.success) return;

  const question = await findOwnedQuestion(
    parsed.data.questionId,
    session.user.id,
  );
  if (!question) return;

  // The card already adopted from this question stays on the board.
  await prisma.question.delete({ where: { id: question.id } });
  revalidateQuestions(question.projectId);
}

export async function setQuestionStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const parsed = setQuestionStatusSchema.safeParse({
    questionId: formData.get("questionId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const question = await findOwnedQuestion(
    parsed.data.questionId,
    session.user.id,
  );
  if (!question) return;

  await prisma.question.update({
    where: { id: question.id },
    data: {
      status: parsed.data.status,
      // Decided the moment it leaves OPEN; forget that if it reopens.
      decidedAt:
        parsed.data.status === "OPEN"
          ? null
          : (question.decidedAt ?? new Date()),
    },
  });

  revalidateQuestions(question.projectId);
}

/**
 * "Adopt as task": create a QUESTION-sourced card and record the decision,
 * so a pondered question becomes scheduled work.
 */
export async function adoptQuestionAction(
  _prev: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in." };

  const parsed = adoptQuestionSchema.safeParse({
    questionId: formData.get("questionId"),
    milestoneId: formData.get("milestoneId"),
    decision: formData.get("decision") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const question = await prisma.question.findFirst({
    where: {
      id: parsed.data.questionId,
      project: ownerWhere(session.user.id),
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      task: { select: { id: true } },
    },
  });
  if (!question) return { success: false, error: "Question not found." };
  if (question.task) {
    return { success: false, error: "This question is already on the board." };
  }

  const milestone = await findMilestoneInProject(
    parsed.data.milestoneId,
    question.projectId,
  );
  if (!milestone) return { success: false, error: "Milestone not found." };

  await prisma.$transaction(async (tx) => {
    const { _max } = await tx.task.aggregate({
      where: { milestoneId: milestone.id, status: "TODO" },
      _max: { order: true },
    });
    await tx.task.create({
      data: {
        milestoneId: milestone.id,
        title: question.title.slice(0, 200),
        status: "TODO",
        priority: "MEDIUM",
        source: "QUESTION",
        sourceQuestionId: question.id,
        order: (_max.order ?? -1) + 1,
      },
    });
    await tx.question.update({
      where: { id: question.id },
      data: {
        status: "ADOPTED",
        decidedAt: new Date(),
        decision: parsed.data.decision,
      },
    });
  });

  revalidatePath(`/projects/${question.projectId}/milestones/${milestone.id}`);
  revalidateQuestions(question.projectId);
  return { success: true };
}
