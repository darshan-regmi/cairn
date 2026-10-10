// Pure date/progress helpers shared by pages, actions, and tests.
// No database access here so the edge cases stay easy to unit-test.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalise a date to local midnight so comparisons are date-only. */
export function toStartOfDay(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export interface TaskLike {
  status: string;
  due?: Date | string | null;
}

export interface MilestoneLike {
  plannedStart?: Date | string | null;
  plannedEnd?: Date | string | null;
  tasks?: TaskLike[];
}

export interface TaskProgress {
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
}

/** Whole days from `from` to `to` (date-only, e.g. end today => 0). */
export function daysBetween(from: Date | string, to: Date | string): number {
  return Math.round(
    (toStartOfDay(to).getTime() - toStartOfDay(from).getTime()) / MS_PER_DAY,
  );
}

/** Derived from the data model: overdue = not DONE and due before today. */
export function isOverdue(task: TaskLike, today: Date): boolean {
  if (task.status === "DONE" || !task.due) return false;
  return toStartOfDay(task.due) < toStartOfDay(today);
}

/** Whole days until plannedEnd; negative means late, 0 means ends today. */
export function daysLeft(milestone: MilestoneLike, today: Date): number {
  return daysBetween(today, milestone.plannedEnd ?? today);
}

/** True when today falls inside the milestone's planned date range. */
export function isCurrent(milestone: MilestoneLike, today: Date): boolean {
  if (!milestone.plannedStart || !milestone.plannedEnd) return false;
  const start = toStartOfDay(milestone.plannedStart);
  const end = toStartOfDay(milestone.plannedEnd);
  const now = toStartOfDay(today);
  return now >= start && now <= end;
}

/** Zero tasks => 0% (an empty milestone is not "done"). */
export function taskProgress(tasks: TaskLike[] | undefined): TaskProgress {
  const totalTasks = tasks?.length ?? 0;
  const doneTasks = (tasks ?? []).filter((task) => task.status === "DONE").length;
  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  return { totalTasks, doneTasks, progressPercent };
}

/** Format as a local YYYY-MM-DD, the format expected by <input type="date">. */
export function toDateInput(value: Date | string): string {
  const date = toStartOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse a YYYY-MM-DD input value into a local-midnight Date. */
export function fromDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}