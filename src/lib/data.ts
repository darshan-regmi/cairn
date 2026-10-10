import { prisma } from "@/lib/prisma";

// All read helpers take the signed-in user id and return only rows that
// belong to that user's projects. Server actions and pages build on these,
// so ownership is enforced in one place.

export function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { milestones: true } } },
  });
}

/** Project + milestones with the task statuses needed to draw progress bars. */
export function findProjectForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: {
      milestones: {
        orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
        include: { tasks: { select: { status: true } } },
      },
    },
  });
}

/** Milestone board: the milestone plus its tasks (for the kanban). */
export function findMilestoneForUser(milestoneId: string, userId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, project: { ownerId: userId } },
    include: {
      project: true,
      tasks: {
        orderBy: [{ status: "asc" }, { order: "asc" }],
      },
    },
  });
}

/** A single task, ownership-checked through milestone -> project. */
export function findTaskForUser(taskId: string, userId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, milestone: { project: { ownerId: userId } } },
    include: { milestone: true },
  });
}