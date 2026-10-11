import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { findProjectForUser } from "@/lib/data";
import { listPendingInvitesForProject, listSupervisorsForProject } from "@/lib/data";
import { projectRoleFor } from "@/lib/access";
import { removeSupervisorAction, revokeInviteAction } from "@/actions/invites";
import {
  daysLeft,
  isCurrent,
  taskProgress,
  toDateInput,
} from "@/lib/milestone-metrics";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  milestoneStatusLabel,
  milestoneStatusTone,
  reviewVerdictLabel,
  reviewVerdictTone,
  type MilestoneStatus,
  type ReviewVerdict,
} from "@/lib/status";
import { AddMilestoneForm } from "@/components/timeline/AddMilestoneForm";
import { MilestoneStatusControl } from "@/components/timeline/MilestoneStatusControl";
import {
  MoveMilestoneButtons,
  RescheduleMilestonePanel,
} from "@/components/timeline/MilestoneControls";
import { InviteSupervisorForm } from "@/components/invites/InviteSupervisorForm";
import { ShareLinkPanel } from "@/components/share/ShareLinkPanel";

function daysLeftLabel(days: number): string {
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  if (days === -1) return "1 day late";
  return `${-days} days late`;
}

export default async function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId } = await params;
  const project = await findProjectForUser(projectId, session.user.id);
  if (!project) notFound();

  // Supervisors get the read-only page, never the editing one.
  const role = await projectRoleFor(project.id, session.user.id);
  if (role === "SUPERVISOR") redirect(`/supervisor/${project.id}`);

  const [supervisors, pendingInvites] = await Promise.all([
    listSupervisorsForProject(project.id),
    listPendingInvitesForProject(project.id),
  ]);

  const today = new Date();
  const milestones = project.milestones.map((milestone, index) => {
    const progress = taskProgress(milestone.tasks);
    return {
      ...milestone,
      index,
      progress,
      days: daysLeft(milestone, today),
      current: isCurrent(milestone, today),
    };
  });

  // The public link needs an absolute URL; build it from the request host.
  const shareToken = project.shareToken;
  let shareUrl: string | null = null;
  if (shareToken) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") ?? "localhost:3000";
    const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
    shareUrl = `${proto}://${host}/share/${shareToken}`;
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-12">
      <Link
        href="/projects"
        className="text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← All projects
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight">
            {project.title}
          </h1>
          {project.goal && (
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              {project.goal}
            </p>
          )}
          <p className="mt-1 text-sm text-muted">
            {toDateInput(project.startDate)} → {toDateInput(project.endDate)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/projects/${project.id}/meetings`}
              className="inline-flex items-center gap-1 rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Meetings
              {project._count.meetings > 0 && (
                <span className="text-muted">· {project._count.meetings}</span>
              )}
            </Link>
            <Link
              href={`/projects/${project.id}/questions`}
              className="inline-flex items-center gap-1 rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Questions
              {project._count.questions > 0 && (
                <span className="text-muted">· {project._count.questions}</span>
              )}
            </Link>
          </div>
        </div>
        <AddMilestoneForm projectId={project.id} />
      </header>

      <section className="mt-8 rounded-lg border border-edge p-5">
        <h2 className="text-lg font-medium">Supervisors</h2>
        <p className="mt-1 text-sm text-muted">
          Invited supervisors can read this project and leave comments. They
          cannot change anything.
        </p>

        <div className="mt-4">
          <InviteSupervisorForm projectId={project.id} />
        </div>

        {supervisors.length > 0 && (
          <ul className="mt-4 space-y-2">
            {supervisors.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-edge px-3 py-2"
              >
                <span className="text-sm">
                  {member.user.name || member.user.email}
                  {member.user.name && (
                    <span className="text-muted"> · {member.user.email}</span>
                  )}
                </span>
                <form action={removeSupervisorAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="userId" value={member.user.id} />
                  <button
                    type="submit"
                    className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {pendingInvites.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium">Pending invites</h3>
            <ul className="mt-2 space-y-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-edge px-3 py-2"
                >
                  <span className="text-sm text-muted">
                    {invite.email} · expires {toDateInput(invite.expiresAt)}
                  </span>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button
                      type="submit"
                      className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                    >
                      Revoke
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mt-8">
        <ShareLinkPanel
          projectId={project.id}
          token={project.shareToken}
          url={shareUrl}
          expiresAt={
            project.shareExpiresAt ? toDateInput(project.shareExpiresAt) : null
          }
          expired={
            project.shareExpiresAt !== null &&
            project.shareExpiresAt.getTime() <= today.getTime()
          }
        />
      </div>

      {milestones.length === 0 ? (
        <section className="mt-16 rounded-lg border border-dashed border-edge p-10 text-center">
          <h2 className="text-lg font-medium">No milestones yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Milestones split the project into reviewable chunks. Add one to
            start planning; then open it to build its task board.
          </p>
        </section>
      ) : (
        <ol className="mt-10 space-y-5">
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className={`rounded-lg border p-5 transition-colors ${
                milestone.current
                  ? "border-accent/60 bg-accent/5"
                  : "border-edge bg-surface"
              }`}
            >
              <div className="flex gap-4">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge text-sm font-semibold text-muted"
                >
                  M{milestone.index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/projects/${project.id}/milestones/${milestone.id}`}
                      className="font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {milestone.name}
                    </Link>
                    <span
                      className={`text-xs font-medium ${
                        (milestone.status as MilestoneStatus) === "DONE"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : milestone.days < 0
                            ? "text-red-700 dark:text-red-400"
                            : "text-muted"
                      }`}
                    >
                      {daysLeftLabel(milestone.days)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={milestoneStatusLabel[milestone.status as MilestoneStatus]}
                      tone={milestoneStatusTone[milestone.status as MilestoneStatus]}
                    />
                    {milestone.review && (
                      <StatusBadge
                        label={
                          reviewVerdictLabel[
                            milestone.review.verdict as ReviewVerdict
                          ]
                        }
                        tone={
                          reviewVerdictTone[
                            milestone.review.verdict as ReviewVerdict
                          ]
                        }
                      />
                    )}
                    <span className="text-xs text-muted">
                      {toDateInput(milestone.plannedStart)} →{" "}
                      {toDateInput(milestone.plannedEnd)}
                    </span>
                  </div>

                  {milestone.goal && (
                    <p className="mt-2 text-sm text-muted">{milestone.goal}</p>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={milestone.progress.progressPercent} />
                    <span className="shrink-0 text-xs text-muted">
                      {milestone.progress.doneTasks}/{milestone.progress.totalTasks}
                      {" · "}
                      {milestone.progress.progressPercent}%
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <MilestoneStatusControl
                      milestoneId={milestone.id}
                      status={milestone.status as MilestoneStatus}
                    />
                    <MoveMilestoneButtons
                      milestoneId={milestone.id}
                      isFirst={milestone.index === 0}
                      isLast={milestone.index === milestones.length - 1}
                    />
                    <RescheduleMilestonePanel
                      milestoneId={milestone.id}
                      plannedStart={toDateInput(milestone.plannedStart)}
                      plannedEnd={toDateInput(milestone.plannedEnd)}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}