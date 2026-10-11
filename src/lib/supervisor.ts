// Pure aggregation for the supervisor home list: turns each supervised
// project into a status badge (on track / behind) and the next meeting date.
// Kept free of database access (like dashboard.ts) so the edge cases are easy
// to unit-test.

import { isOverdue, toStartOfDay } from "@/lib/milestone-metrics";

export interface SupervisedTaskInput {
  status: string;
  due: Date | null;
}

export interface SupervisedMilestoneInput {
  status: string;
  plannedEnd: Date;
  tasks: SupervisedTaskInput[];
}

export interface SupervisedMeetingInput {
  date: Date;
  nextMeetingDate: Date | null;
}

export interface SupervisedProjectInput {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  milestones: SupervisedMilestoneInput[];
  meetings: SupervisedMeetingInput[];
}

export interface SupervisedProjectSummary {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  milestoneCount: number;
  /** True when work is overdue or a milestone has slipped past its end date. */
  isBehind: boolean;
  /** The nearest still-upcoming meeting date, or null when none is scheduled. */
  nextMeetingDate: Date | null;
}

export function summarizeSupervisedProjects(
  projects: SupervisedProjectInput[],
  today: Date,
): SupervisedProjectSummary[] {
  const now = toStartOfDay(today);

  return projects.map((project) => {
    const overdueTask = project.milestones.some((milestone) =>
      milestone.tasks.some((task) => isOverdue(task, today)),
    );
    const slippedMilestone = project.milestones.some(
      (milestone) =>
        milestone.status !== "DONE" &&
        toStartOfDay(milestone.plannedEnd) < now,
    );

    const upcoming = project.meetings
      .map((meeting) => meeting.nextMeetingDate)
      .filter((date): date is Date => date !== null && date >= now)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      id: project.id,
      title: project.title,
      startDate: project.startDate,
      endDate: project.endDate,
      milestoneCount: project.milestones.length,
      isBehind: overdueTask || slippedMilestone,
      nextMeetingDate: upcoming[0] ?? null,
    };
  });
}
