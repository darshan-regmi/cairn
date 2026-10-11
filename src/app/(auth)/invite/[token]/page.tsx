import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectRoleFor } from "@/lib/access";
import { hashInviteToken, isInviteUsable } from "@/lib/invites";
import { AcceptInviteForm } from "@/components/invites/AcceptInviteForm";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { project: { select: { id: true, title: true } } },
  });
  if (!invite) notFound();

  const usable = isInviteUsable(invite);
  const role = session?.user
    ? await projectRoleFor(invite.projectId, session.user.id)
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl tracking-tight">Supervisor invitation</h1>
        <p className="text-sm text-muted">{invite.project.title}</p>
        <p className="text-xs text-muted">Invited: {invite.email}</p>
      </div>

      {role ? (
        <div className="space-y-3">
          <p className="text-center text-sm">
            You are already {role === "OWNER" ? "the owner" : "a supervisor"} of
            this project.
          </p>
          <Link
            href={role === "OWNER" ? `/projects/${invite.projectId}` : "/supervisor"}
            className="block w-full rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
          >
            {role === "OWNER" ? "Open project" : "Go to supervised projects"}
          </Link>
        </div>
      ) : !usable ? (
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-center text-sm">
          {invite.acceptedAt
            ? "This invitation has already been used."
            : "This invitation has expired."}
        </p>
      ) : session?.user ? (
        <AcceptInviteForm token={token} />
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted">
            Log in or create an account to accept this invitation.
          </p>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
            className="block w-full rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
          >
            Log in
          </Link>
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
            className="block w-full rounded-md border border-edge px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Create an account
          </Link>
        </div>
      )}
    </div>
  );
}