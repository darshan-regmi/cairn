import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findProjectForUser } from "@/lib/data";
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
  type MilestoneStatus,
} from "@/lib/status";
import { AddMilestoneForm } from "@/components/timeline/AddMilestoneForm";
import { MilestoneStatusControl } from "@/components/timeline/MilestoneStatusControl";

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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link
        href="/projects"
        className="text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← All projects
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
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
        </div>
        <AddMilestoneForm projectId={project.id} />
      </header>

      {milestones.length === 0 ? (
        <section className="mt-16 rounded-lg border border-dashed border-edge p-10 text-center">
          <h2 className="text-lg font-medium">No milestones yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Milestones split the project into reviewable chunks. Add one to
            start planning; then open it to build its task board.
          </p>
        </section>
      ) : (
        <ol className="mt-10 space-y-4">
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
                    <a
                      href={`/projects/${project.id}/milestones/${milestone.id}`}
                      className="font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {milestone.name}
                    </a>
                    <span
                      className={`text-xs font-medium ${
                        (milestone.status as MilestoneStatus) === "DONE"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : milestone.days < 0
                            ? "text-red-600 dark:text-red-400"
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

                  <div className="mt-3">
                    <MilestoneStatusControl
                      milestoneId={milestone.id}
                      status={milestone.status as MilestoneStatus}
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