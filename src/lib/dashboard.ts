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

export interface DashboardProjectInput {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  milestones: DashboardMilestoneInput[];
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

export interface DashboardSummary {
  projectCount: number;
  milestoneCount: number;
  progress: TaskProgress;
  overdue: OverdueTask[];
  upcoming: UpcomingMilestone[];
  projects: DashboardProjectSummary[];
}

/** Default cap on the "Coming up" list so the overview stays glanceable. */
export const UPCOMING_LIMIT = 5;

export function summarizeDashboard(
  projects: DashboardProjectInput[],
  today: Date,
  upcomingLimit = UPCOMING_LIMIT,
): DashboardSummary {
  const overdue: OverdueTask[] = [];
  const upcoming: UpcomingMilestone[] = [];
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
  upcoming.sort((a, b) => byDate(a.plannedEnd, b.plannedEnd));

  return {
    projectCount: projects.length,
    milestoneCount,
    progress: taskProgress(allTasks),
    overdue,
    upcoming: upcoming.slice(0, upcomingLimit),
    projects: summaries,
  };
}
