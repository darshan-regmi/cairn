// Pure dashboard aggregation: turns the user's projects into progress totals,
// overdue tasks and upcoming milestones. Kept free of database access (like
// milestone-metrics.ts) so the date/limit edge cases are easy to unit-test.

import {
  daysBetween,
  daysLeft,
  isOverdue,
  taskProgress,
  toStartOfDay,
  type TaskProgress,
} from "@/lib/milestone-metrics";

export interface DashboardTaskInput {
  id: string;
  title: string;
  status: string;
  due: Date | null;
  priority: string;
}

export interface DashboardMilestoneInput {
  id: string;
  name: string;
  status: string;
  plannedEnd: Date;
  tasks: DashboardTaskInput[];
}

export interface DashboardMeetingActionInput {
  id: string;
  text: string;
  task: { id: string; status: string } | null;
}

export interface DashboardMeetingInput {
  id: string;
  date: Date;
  nextMeetingDate: Date | null;
  problems: string | null;
  actionItems: DashboardMeetingActionInput[];
}

export interface DashboardQuestionInput {
  id: string;
  title: string;
  raisedAt: Date;
  milestoneId: string | null;
  milestone: { name: string } | null;
}

export interface DashboardCommentInput {
  id: string;
  body: string;
  createdAt: Date;
  targetType: string;
  targetId: string;
  author: { name: string | null; email: string };
}

export interface DashboardProjectInput {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  milestones: DashboardMilestoneInput[];
  meetings?: DashboardMeetingInput[];
  questions?: DashboardQuestionInput[];
  comments?: DashboardCommentInput[];
}

export interface OverdueTask {
  id: string;
  title: string;
  priority: string;
  due: Date;
  daysLate: number;
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  projectTitle: string;
}

export interface UpcomingMilestone {
  id: string;
  name: string;
  plannedEnd: Date;
  daysUntilEnd: number;
  projectId: string;
  projectTitle: string;
  progress: TaskProgress;
}

export interface DashboardProjectSummary {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  milestoneCount: number;
  progress: TaskProgress;
}

export interface DueSoonTask {
  id: string;
  title: string;
  priority: string;
  due: Date;
  daysUntilDue: number;
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  projectTitle: string;
}

export interface BlockedTask {
  id: string;
  title: string;
  priority: string;
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  projectTitle: string;
}

export interface MeetingPrep {
  id: string;
  date: Date;
  nextMeetingDate: Date | null;
  problems: string | null;
  projectId: string;
  projectTitle: string;
  actionItems: { id: string; text: string; taskStatus: string | null }[];
}

export interface OpenQuestion {
  id: string;
  title: string;
  raisedAt: Date;
  projectId: string;
  projectTitle: string;
  milestoneName: string | null;
}

export interface UnreadComment {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
  authorEmail: string;
  projectId: string;
  projectTitle: string;
  targetType: string;
  targetId: string;
  link: string;
}

export interface DashboardSummary {
  projectCount: number;
  milestoneCount: number;
  progress: TaskProgress;
  overdue: OverdueTask[];
  blocked: BlockedTask[];
  dueSoon: DueSoonTask[];
  upcoming: UpcomingMilestone[];
  meetingPrep: MeetingPrep[];
  openQuestions: OpenQuestion[];
  unreadComments: UnreadComment[];
  projects: DashboardProjectSummary[];
}

/** Default cap on the "Coming up" list so the overview stays glanceable. */
export const UPCOMING_LIMIT = 5;

/** A task due within this many whole days counts as "due soon". */
export const DUE_SOON_DAYS = 7;

/** Where a comment's target lives, so the dashboard can link straight to it. */
function commentLink(
  projectId: string,
  targetType: string,
  targetId: string,
): string {
  switch (targetType) {
    case "MILESTONE":
      return `/projects/${projectId}/milestones/${targetId}`;
    case "MEETING":
      return `/projects/${projectId}/meetings`;
    case "QUESTION":
      return `/projects/${projectId}/questions`;
    default:
      return `/projects/${projectId}`;
  }
}

export function summarizeDashboard(
  projects: DashboardProjectInput[],
  today: Date,
  upcomingLimit = UPCOMING_LIMIT,
  commentsReadAt: Date | null = null,
): DashboardSummary {
  const overdue: OverdueTask[] = [];
  const blocked: BlockedTask[] = [];
  const dueSoon: DueSoonTask[] = [];
  const upcoming: UpcomingMilestone[] = [];
  const meetingPrep: MeetingPrep[] = [];
  const openQuestions: OpenQuestion[] = [];
  const unreadComments: UnreadComment[] = [];
  const allTasks: DashboardTaskInput[] = [];
  let milestoneCount = 0;

  const summaries: DashboardProjectSummary[] = projects.map((project) => {
    milestoneCount += project.milestones.length;
    const projectTasks: DashboardTaskInput[] = [];

    for (const milestone of project.milestones) {
      projectTasks.push(...milestone.tasks);
      allTasks.push(...milestone.tasks);

      for (const task of milestone.tasks) {
        if (task.due && isOverdue(task, today)) {
          overdue.push({
            id: task.id,
            title: task.title,
            priority: task.priority,
            due: task.due,
            daysLate: daysBetween(task.due, today),
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            projectId: project.id,
            projectTitle: project.title,
          });
        }

        if (task.status === "BLOCKED") {
          blocked.push({
            id: task.id,
            title: task.title,
            priority: task.priority,
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            projectId: project.id,
            projectTitle: project.title,
          });
        }

        // Due soon: not finished, due today or within the next week.
        if (task.status !== "DONE" && task.due) {
          const daysUntilDue = daysBetween(today, task.due);
          if (daysUntilDue >= 0 && daysUntilDue <= DUE_SOON_DAYS) {
            dueSoon.push({
              id: task.id,
              title: task.title,
              priority: task.priority,
              due: task.due,
              daysUntilDue,
              milestoneId: milestone.id,
              milestoneName: milestone.name,
              projectId: project.id,
              projectTitle: project.title,
            });
          }
        }
      }

      // "Coming up" means not finished and not already past its end date.
      if (milestone.status !== "DONE" && daysLeft(milestone, today) >= 0) {
        upcoming.push({
          id: milestone.id,
          name: milestone.name,
          plannedEnd: milestone.plannedEnd,
          daysUntilEnd: daysLeft(milestone, today),
          projectId: project.id,
          projectTitle: project.title,
          progress: taskProgress(milestone.tasks),
        });
      }
    }

    // Meeting prep is about the most recent meeting: what is still open from it
    // and the problems that were raised. The query orders meetings newest first.
    const latestMeeting = (project.meetings ?? [])[0];
    if (
      latestMeeting &&
      (latestMeeting.actionItems.length > 0 || latestMeeting.problems)
    ) {
      meetingPrep.push({
        id: latestMeeting.id,
        date: latestMeeting.date,
        nextMeetingDate: latestMeeting.nextMeetingDate,
        problems: latestMeeting.problems,
        projectId: project.id,
        projectTitle: project.title,
        actionItems: latestMeeting.actionItems.map((item) => ({
          id: item.id,
          text: item.text,
          taskStatus: item.task?.status ?? null,
        })),
      });
    }

    for (const question of project.questions ?? []) {
      openQuestions.push({
        id: question.id,
        title: question.title,
        raisedAt: question.raisedAt,
        projectId: project.id,
        projectTitle: project.title,
        milestoneName: question.milestone?.name ?? null,
      });
    }

    for (const comment of project.comments ?? []) {
      if (commentsReadAt && comment.createdAt <= commentsReadAt) continue;
      unreadComments.push({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        authorName: comment.author.name,
        authorEmail: comment.author.email,
        projectId: project.id,
        projectTitle: project.title,
        targetType: comment.targetType,
        targetId: comment.targetId,
        link: commentLink(project.id, comment.targetType, comment.targetId),
      });
    }

    return {
      id: project.id,
      title: project.title,
      startDate: project.startDate,
      endDate: project.endDate,
      milestoneCount: project.milestones.length,
      progress: taskProgress(projectTasks),
    };
  });

  const byDate = (a: Date, b: Date) =>
    toStartOfDay(a).getTime() - toStartOfDay(b).getTime();

  overdue.sort((a, b) => byDate(a.due, b.due));
  dueSoon.sort((a, b) => byDate(a.due, b.due));
  upcoming.sort((a, b) => byDate(a.plannedEnd, b.plannedEnd));
  meetingPrep.sort((a, b) => byDate(b.date, a.date));
  openQuestions.sort((a, b) => byDate(b.raisedAt, a.raisedAt));
  unreadComments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    projectCount: projects.length,
    milestoneCount,
    progress: taskProgress(allTasks),
    overdue,
    blocked,
    dueSoon,
    upcoming: upcoming.slice(0, upcomingLimit),
    meetingPrep,
    openQuestions,
    unreadComments,
    projects: summaries,
  };
}
