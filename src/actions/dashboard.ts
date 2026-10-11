"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Stamp the signed-in owner's "supervisor comments read" watermark. The
 * dashboard counts comments by other people newer than this timestamp as
 * unread, so one click clears the whole list.
 */
export async function markCommentsReadAction() {
  const session = await auth();
  if (!session?.user) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { commentsReadAt: new Date() },
  });

  revalidatePath("/projects");
}
