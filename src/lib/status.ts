// Shared literal types + human labels for enums from prisma/schema.prisma.
// Kept in plain TS so server components and client components can both use
// them without pulling the generated client into the browser bundle.

export const MILESTONE_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "SLIPPED",
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_SOURCES = ["PLANNED", "MEETING", "QUESTION", "REVIEW"] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export const milestoneStatusLabel: Record<MilestoneStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  SLIPPED: "Slipped",
};

export const milestoneStatusTone: Record<MilestoneStatus, StatusTone> = {
  PLANNED: "blue",
  IN_PROGRESS: "amber",
  DONE: "emerald",
  SLIPPED: "red",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const priorityLabel: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const sourceLabel: Record<TaskSource, string> = {
  PLANNED: "Planned",
  MEETING: "From meeting",
  QUESTION: "From question",
  REVIEW: "From review",
};

export type StatusTone =
  | "zinc"
  | "blue"
  | "amber"
  | "emerald"
  | "red"
  | "accent";

export const statusToneClasses: Record<StatusTone, string> = {
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  amber:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  accent:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

export const priorityClass: Record<Priority, string> = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

/** Same mapping as priorityClass, for use with the shared StatusBadge. */
export const priorityTone: Record<Priority, StatusTone> = {
  HIGH: "red",
  MEDIUM: "amber",
  LOW: "zinc",
};

/** Dot colour per column, used on the kanban column headers. */
export const columnDotClass: Record<TaskStatus, string> = {
  TODO: "bg-zinc-400",
  IN_PROGRESS: "bg-amber-400",
  BLOCKED: "bg-red-500",
  DONE: "bg-emerald-500",
};

export const QUESTION_STATUSES = [
  "OPEN",
  "ADOPTED",
  "PARKED",
  "DROPPED",
] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const questionStatusLabel: Record<QuestionStatus, string> = {
  OPEN: "Open",
  ADOPTED: "Adopted",
  PARKED: "Parked",
  DROPPED: "Dropped",
};

export const questionStatusTone: Record<QuestionStatus, StatusTone> = {
  OPEN: "blue",
  ADOPTED: "emerald",
  PARKED: "amber",
  DROPPED: "zinc",
};

export const REVIEW_VERDICTS = [
  "ON_TRACK",
  "PARTLY_MET",
  "OFF_TRACK",
] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export const reviewVerdictLabel: Record<ReviewVerdict, string> = {
  ON_TRACK: "On track",
  PARTLY_MET: "Partly met",
  OFF_TRACK: "Off track",
};

export const reviewVerdictTone: Record<ReviewVerdict, StatusTone> = {
  ON_TRACK: "emerald",
  PARTLY_MET: "amber",
  OFF_TRACK: "red",
};