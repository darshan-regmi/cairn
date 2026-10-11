// Authorization lives on ProjectMember, not on a single owner column.
//
//   memberWhere -> projects a user can read   (OWNER or SUPERVISOR)
//   ownerWhere  -> projects a user can change (OWNER only)
//
// Reads in src/lib/data.ts use memberWhere; every write action uses
// ownerWhere before it touches a row.

import { prisma } from "@/lib/prisma";

/** Prisma filter for the projects a user can read: any membership. */
export function memberWhere(userId: string) {
  return { members: { some: { userId } } };
}

/**
 * Prisma filter for the projects a user can change: an OWNER membership only.
 * Supervisors never create, edit, move or delete.
 */
export function ownerWhere(userId: string) {
  return { members: { some: { userId, role: "OWNER" as const } } };
}

/** The user's role in one project, or null when they are not a member. */
export async function projectRoleFor(
  projectId: string,
  userId: string,
): Promise<"OWNER" | "SUPERVISOR" | null> {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { role: true },
  });
  return member?.role ?? null;
}
