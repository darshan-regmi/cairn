// Account roles, kept in plain TS (like src/lib/status.ts) so both server and
// client components can use them without pulling the generated Prisma client
// into the browser bundle.
//
// This is the person's role in general. What they may do inside one project is
// separate and lives on ProjectMember.role (OWNER or SUPERVISOR).

export const USER_ROLES = ["NORMAL", "STUDENT", "SUPERVISOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const userRoleLabel: Record<UserRole, string> = {
  NORMAL: "Normal user",
  STUDENT: "Student",
  SUPERVISOR: "Supervisor",
};

/** One-line summary of each role, shown at sign up and in the docs. */
export const userRoleBlurb: Record<UserRole, string> = {
  NORMAL: "Create projects and run their kanban boards.",
  STUDENT:
    "Everything a normal user gets, plus reviews, questions, decisions and evidence.",
  SUPERVISOR:
    "View and comment on projects they are invited to. Nothing else.",
};

/**
 * The research toolkit: milestone reviews, the question board (and the
 * decisions recorded there) and evidence. Only student accounts may write
 * these; any role that can read a project still sees what is there.
 */
export function canUseResearchTools(role: string | null | undefined): boolean {
  return role === "STUDENT";
}

/** Supervisors are invited to projects; they never create or own one. */
export function canOwnProjects(role: string | null | undefined): boolean {
  return role !== "SUPERVISOR";
}
