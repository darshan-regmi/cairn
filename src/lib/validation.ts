import { z } from "zod";

export const signUpSchema = z.object({
  // nullish: FormData.get() returns null when a field is absent.
  name: z.string().trim().max(80).nullish(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- Phase 1: planning core ----------

const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker to pick a date.");

const taskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export const taskStatusSchema = z.enum(taskStatuses);

const priorities = ["HIGH", "MEDIUM", "LOW"] as const;
export const prioritySchema = z.enum(priorities);

export const createProjectSchema = z
  .object({
    title: z.string().trim().min(1, "Give the project a title.").max(120),
    startDate: dateInput,
    endDate: dateInput,
  })
  .refine(
    (input) => input.endDate >= input.startDate,
    { message: "End date must be on or after the start date.", path: ["endDate"] },
  );

export const createMilestoneSchema = z
  .object({
    name: z.string().trim().min(1, "Give the milestone a name.").max(120),
    plannedStart: dateInput,
    plannedEnd: dateInput,
    goal: z.string().trim().max(500).optional(),
  })
  .refine(
    (input) => input.plannedEnd >= input.plannedStart,
    { message: "End date must be on or after the start date.", path: ["plannedEnd"] },
  );

// A project plan parsed from a GanttProject-style CSV. Dates stay as
// YYYY-MM-DD strings here; the action converts them when writing to the DB.
export const importProjectSchema = z
  .object({
    title: z.string().trim().min(1, "Give the project a title.").max(120),
    startDate: dateInput,
    endDate: dateInput,
    goal: z.string().trim().max(500).nullish(),
    milestones: z.array(
      z
        .object({
          name: z.string().trim().min(1, "Give the milestone a name.").max(120),
          plannedStart: dateInput,
          plannedEnd: dateInput,
          goal: z.string().trim().max(500).nullish(),
          tasks: z.array(
            z.object({
              title: z.string().trim().min(1).max(120),
              due: dateInput,
              notes: z.string().trim().max(1000).nullish(),
            }),
          ),
        })
        .refine(
          (input) => input.plannedEnd >= input.plannedStart,
          {
            message: "End date must be on or after the start date.",
            path: ["plannedEnd"],
          },
        ),
    ),
  })
  .refine(
    (input) => input.endDate >= input.startDate,
    { message: "End date must be on or after the start date.", path: ["endDate"] },
  );

export const milestoneStatusSchema = z.enum([
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "SLIPPED",
]);

export const saveTaskSchema = z.object({
  taskId: z.string().min(1).optional(),
  milestoneId: z.string().min(1, "Missing milestone."),
  title: z.string().trim().min(1, "Give the task a title.").max(200),
  status: taskStatusSchema,
  priority: prioritySchema,
  // Empty string from the date input means "no due date".
  due: dateInput.nullish().transform((v) => (v ? new Date(`${v}T00:00:00`) : null)),
  notes: z.string().trim().max(2000).optional(),
  commit: z.string().trim().max(100).optional(),
});

export const deleteTaskSchema = z.object({
  taskId: z.string().min(1),
});

export const moveTasksSchema = z.object({
  milestoneId: z.string().min(1),
  columns: z
    .array(
      z.object({
        status: taskStatusSchema,
        taskIds: z.array(z.string()),
      }),
    )
    .min(1)
    .max(4),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type SaveTaskInput = z.infer<typeof saveTaskSchema>;
export type MoveTasksInput = z.infer<typeof moveTasksSchema>;

// ---------- Invites and comments ----------

export const inviteEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

// 48 hex characters: the raw token that generateInviteToken() produces.
export const inviteTokenSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{48}$/, "This invitation link is not valid.");

export const memberIdsSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export const commentTargets = [
  "MILESTONE",
  "TASK",
  "MEETING",
  "REVIEW",
  "QUESTION",
  "EVIDENCE",
] as const;
export type CommentTarget = (typeof commentTargets)[number];
export const commentTargetSchema = z.enum(commentTargets);

export const createCommentSchema = z.object({
  targetType: commentTargetSchema,
  targetId: z.string().min(1),
  body: z.string().trim().min(1, "Write a comment first.").max(2000),
});

export const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  body: z.string().trim().min(1, "Write a comment first.").max(2000),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});

export type CreateInviteInput = z.infer<typeof inviteEmailSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ---------- Meetings ----------

// Empty textareas arrive as "" and are stored as null so "not written" and
// "written nothing" stay the same thing.
const optionalNote = z
  .string()
  .trim()
  .max(4000)
  .nullish()
  .transform((value) => (value ? value : null));

export const createMeetingSchema = z.object({
  projectId: z.string().min(1, "Missing project."),
  milestoneId: z.string().min(1).nullish(),
  date: dateInput,
  nextMeetingDate: dateInput.nullish(),
  itemsDiscussed: optionalNote,
  achievements: optionalNote,
  problems: optionalNote,
  // Free text, one agreed action per line; parsed by parseActionLines().
  actionItems: z.string().max(8000).nullish(),
});

export const updateMeetingSchema = z.object({
  meetingId: z.string().min(1),
  milestoneId: z.string().min(1).nullish(),
  date: dateInput,
  nextMeetingDate: dateInput.nullish(),
  itemsDiscussed: optionalNote,
  achievements: optionalNote,
  problems: optionalNote,
});

export const deleteMeetingSchema = z.object({
  meetingId: z.string().min(1),
});

export const addMeetingTaskSchema = z.object({
  meetingId: z.string().min(1),
  text: z.string().trim().min(1, "Write the action first.").max(200),
});

export const deleteMeetingTaskSchema = z.object({
  meetingTaskId: z.string().min(1),
});

// Converting an action into a card needs a milestone to put it on: the
// meeting's own one, or a chosen one when the meeting has none.
export const convertMeetingTaskSchema = z.object({
  meetingTaskId: z.string().min(1),
  milestoneId: z.string().min(1, "Pick a milestone for the task."),
});

// ---------- Open questions ----------

const questionFields = {
  title: z.string().trim().min(1, "Write the question.").max(200),
  context: optionalNote,
  ifWeDoIt: optionalNote,
  whatItCosts: optionalNote,
  ifWeDont: optionalNote,
};

export const createQuestionSchema = z.object({
  projectId: z.string().min(1, "Missing project."),
  milestoneId: z.string().min(1).nullish(),
  ...questionFields,
});

export const updateQuestionSchema = z.object({
  questionId: z.string().min(1),
  milestoneId: z.string().min(1).nullish(),
  ...questionFields,
});

export const deleteQuestionSchema = z.object({
  questionId: z.string().min(1),
});

export const setQuestionStatusSchema = z.object({
  questionId: z.string().min(1),
  status: z.enum(["OPEN", "ADOPTED", "PARKED", "DROPPED"]),
});

export const adoptQuestionSchema = z.object({
  questionId: z.string().min(1),
  milestoneId: z.string().min(1, "Pick a milestone for the task."),
  decision: optionalNote,
});

// ---------- Milestone reviews ----------

// One review per milestone (milestoneId is unique), so saving upserts.
export const saveReviewSchema = z.object({
  milestoneId: z.string().min(1),
  date: dateInput,
  verdict: z.enum(["ON_TRACK", "PARTLY_MET", "OFF_TRACK"]),
  askedFor: optionalNote,
  demonstrated: optionalNote,
  promised: optionalNote,
});

export const deleteReviewSchema = z.object({
  milestoneId: z.string().min(1),
});

// ---------- Public share links ----------

// Empty date input means "no expiry". The chosen day is inclusive: storing the
// end of the day keeps the link live through it.
export const saveShareLinkSchema = z.object({
  projectId: z.string().min(1, "Missing project."),
  expiresAt: dateInput
    .nullish()
    .transform((value) => (value ? new Date(`${value}T23:59:59.999`) : null)),
});

export const revokeShareLinkSchema = z.object({
  projectId: z.string().min(1, "Missing project."),
});

// 32 hex characters: the raw token that generateShareToken() produces.
export const shareTokenSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{32}$/, "This share link is not valid.");

// ---------- Evidence ----------

const evidenceTypes = [
  "DEMO",
  "SCREENSHOT",
  "TEST_RESULT",
  "BENCHMARK",
  "COMMIT_OR_PR",
  "SUPERVISOR_FEEDBACK",
] as const;

// Optional evidence link: blank stays null, otherwise it must be an http(s)
// URL (no javascript: or other schemes, since it is rendered as a link).
const optionalEvidenceUrl = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^https?:\/\/\S+$/i.test(value), {
    message: "Enter a link starting with http:// or https://.",
  });

const evidenceFields = {
  title: z.string().trim().min(1, "Give the evidence a title.").max(200),
  date: dateInput,
  type: z.enum(evidenceTypes),
  url: optionalEvidenceUrl,
  whatItProves: optionalNote,
};

export const createEvidenceSchema = z.object({
  milestoneId: z.string().min(1, "Missing milestone."),
  ...evidenceFields,
});

export const updateEvidenceSchema = z.object({
  evidenceId: z.string().min(1, "Missing evidence."),
  ...evidenceFields,
});

export const deleteEvidenceSchema = z.object({
  evidenceId: z.string().min(1, "Missing evidence."),
});