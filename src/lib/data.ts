import { prisma } from "@/lib/prisma";
import { memberWhere, ownerWhere } from "@/lib/access";
import { isShareActive } from "@/lib/share";
import type { CommentTarget } from "@/lib/validation";

// All read helpers take the signed-in user id and return only rows from
// projects the user is a member of (owner or supervisor). Server actions and
// pages build on these, so access is enforced in one place.

/** Projects the user owns (student workspace list). */
export function listOwnedProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: ownerWhere(userId),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { milestones: true } } },
  });
}

/**
 * Dashboard overview: the user's owned projects with every milestone's task
 * statuses and due dates, so progress, overdue work and upcoming milestones can
 * be derived in one round trip. Ownership is enforced through ownerWhere.
 */
export function findDashboardForUser(userId: string) {
  return prisma.project.findMany({
    where: ownerWhere(userId),
    orderBy: { createdAt: "desc" },
    include: {
      milestones: {
        orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              due: true,
              priority: true,
            },
          },
        },
      },
    },
  });
}

/** Projects the user supervises (supervisor home list). */
export function listSupervisedProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { members: { some: { userId, role: "SUPERVISOR" } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { milestones: true } },
      milestones: {
        select: {
          status: true,
          plannedEnd: true,
          tasks: { select: { status: true, due: true } },
        },
      },
      meetings: {
        select: { date: true, nextMeetingDate: true },
        orderBy: { date: "desc" },
      },
    },
  });
}

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
      _count: { select: { meetings: true, questions: true } },
      milestones: {
        orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
        include: {
          review: { select: { verdict: true } },
          tasks: { select: { status: true } },
        },
      },
    },
  });
}

/**
 * A project opened through its public share link. This is deliberately the one
 * read helper not scoped through ProjectMember: the unguessable token is the
 * capability, and an expired or revoked link returns null. Only the fields the
 * read-only page draws are selected, so owner-only notes are never exposed.
 */
export async function findSharedProject(token: string, now = new Date()) {
  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      milestones: {
        orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
        include: {
          review: { select: { verdict: true } },
          deliverables: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, url: true, doneAt: true },
          },
          tasks: {
            orderBy: [{ status: "asc" }, { order: "asc" }],
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              due: true,
            },
          },
        },
      },
      meetings: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          nextMeetingDate: true,
          itemsDiscussed: true,
          achievements: true,
          problems: true,
        },
      },
    },
  });
  if (!project || !isShareActive(project, now)) return null;
  return project;
}

/** Milestone board: the milestone plus its tasks (for the kanban) and review. */
export function findMilestoneForUser(milestoneId: string, userId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, project: memberWhere(userId) },
    include: {
      project: true,
      review: true,
      evidence: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
      deliverables: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      meetings: {
        orderBy: { date: "desc" },
        include: { actionItems: { orderBy: { createdAt: "asc" } } },
      },
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

/** Read-only supervisor view of one project: milestones, meetings, questions. */
export function findSupervisorProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, members: { some: { userId, role: "SUPERVISOR" } } },
    include: {
      milestones: {
        orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
        include: {
          review: true,
          evidence: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
          deliverables: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
          tasks: { select: { status: true } },
        },
      },
      meetings: {
        orderBy: { date: "desc" },
        include: { actionItems: { orderBy: { createdAt: "asc" } } },
      },
      questions: {
        orderBy: { raisedAt: "desc" },
      },
    },
  });
}

/** Meetings page: the project, its milestones (for the picker), and its meetings. */
export function findMeetingsForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ...memberWhere(userId) },
    select: {
      id: true,
      title: true,
      milestones: {
        orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
        select: { id: true, name: true },
      },
      meetings: {
        orderBy: { date: "desc" },
        include: {
          milestone: { select: { id: true, name: true } },
          actionItems: {
            orderBy: { createdAt: "asc" },
            include: {
              task: { select: { id: true, status: true, milestoneId: true } },
            },
          },
        },
      },
    },
  });
}

/** Questions page: the project, its milestones (for the picker), and its questions. */
export function findQuestionsForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ...memberWhere(userId) },
    select: {
      id: true,
      title: true,
      milestones: {
        orderBy: [{ order: "asc" }, { plannedStart: "asc" }],
        select: { id: true, name: true },
      },
      questions: {
        orderBy: { raisedAt: "desc" },
        include: {
          milestone: { select: { id: true, name: true } },
          task: { select: { id: true, status: true, milestoneId: true } },
        },
      },
    },
  });
}

/** The supervisor members of a project (owner page renders them with Remove). */
export function listSupervisorsForProject(projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId, role: "SUPERVISOR" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Unused invites for a project (owner page renders them with Revoke). */
export function listPendingInvitesForProject(projectId: string) {
  return prisma.invite.findMany({
    where: { projectId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

/** Comments on one item, oldest first, with the author included. */
export function listCommentsForTarget(targetType: CommentTarget, targetId: string) {
  return prisma.comment.findMany({
    where: { targetType, targetId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Comments for many items of one target type, in a single round trip. Pages
 * that render a list (meetings, questions, evidence, tasks) use this and then
 * group by targetId instead of issuing one query per item.
 */
export function listCommentsForTargets(
  targetType: CommentTarget,
  targetIds: string[],
) {
  return prisma.comment.findMany({
    where: { targetType, targetId: { in: targetIds } },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}
