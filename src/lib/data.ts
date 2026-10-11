import { prisma } from "@/lib/prisma";
import { memberWhere } from "@/lib/access";

// All read helpers take the signed-in user id and return only rows from
// projects the user is a member of (owner or supervisor). Server actions and
// pages build on these, so access is enforced in one place.

export function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: memberWhere(userId),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { milestones: true } } },
  });
}

/** Project + milestones with the task statuses needed to draw progress bars. */
export function findProjectForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ...memberWhere(userId) },
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
    where: { id: milestoneId, project: memberWhere(userId) },
    include: {
      project: true,
      tasks: {
        orderBy: [{ status: "asc" }, { order: "asc" }],
      },
    },
  });
}

/** A single task, access-checked through milestone -> project membership. */
export function findTaskForUser(taskId: string, userId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, milestone: { project: memberWhere(userId) } },
    include: { milestone: true },
  });
}
