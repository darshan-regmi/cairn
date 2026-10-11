import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findSharedProject } from "@/lib/data";
import { shareTokenSchema } from "@/lib/validation";
import { daysLeft, taskProgress, toDateInput } from "@/lib/milestone-metrics";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  milestoneStatusLabel,
  milestoneStatusTone,
  priorityLabel,
  priorityTone,
  reviewVerdictLabel,
  reviewVerdictTone,
  taskStatusLabel,
  taskStatusTone,
  type MilestoneStatus,
  type Priority,
  type ReviewVerdict,
  type TaskStatus,
} from "@/lib/status";

export const metadata: Metadata = {
  title: "Shared project · FYP Planner",
  // Capability links should stay out of search indexes.
  robots: { index: false, follow: false },
};

function daysLabel(days: number): string {
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  if (days === -1) return "1 day late";
  return `${-days} days late`;
}

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!shareTokenSchema.safeParse(token).success) notFound();

  const project = await findSharedProject(token);
  if (!project) notFound();

  const today = new Date();
  const overall = taskProgress(
    project.milestones.flatMap((milestone) => milestone.tasks),
  );

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-12">
      <p className="font-display text-base tracking-tight">FYP Planner</p>

      <header className="mt-6 border-b border-edge pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Shared project · read only
        </p>
        <h1 className="mt-1 text-2xl tracking-tight">{project.title}</h1>
        {project.goal && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {project.goal}
          </p>
        )}
        <p className="mt-1 text-sm text-muted">
          {toDateInput(project.startDate)} → {toDateInput(project.endDate)}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={overall.progressPercent} />
          <span className="shrink-0 text-xs text-muted">
            {overall.doneTasks}/{overall.totalTasks} · {overall.progressPercent}%
          </span>
        </div>
      </header>

      <section aria-labelledby="milestones-heading" className="mt-8">
        <h2 id="milestones-heading" className="text-lg font-medium">
          Milestones
        </h2>

        {project.milestones.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No milestones yet.</p>
        ) : (
          <ol className="mt-4 space-y-5">
            {project.milestones.map((milestone, index) => {
              const progress = taskProgress(milestone.tasks);
              return (
                <li
                  key={milestone.id}
                  className="rounded-lg border border-edge p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">
                      <span className="text-muted">M{index + 1} · </span>
                      {milestone.name}
                    </h3>
                    <StatusBadge
                      label={
                        milestoneStatusLabel[milestone.status as MilestoneStatus]
                      }
                      tone={
                        milestoneStatusTone[milestone.status as MilestoneStatus]
                      }
                    />
                  </div>

                  <p className="mt-1 text-sm text-muted">
                    {toDateInput(milestone.plannedStart)} →{" "}
                    {toDateInput(milestone.plannedEnd)}
                  </p>
                  {milestone.goal && (
                    <p className="mt-2 text-sm">{milestone.goal}</p>
                  )}
                  {milestone.scope && (
                    <p className="mt-2 text-sm text-muted">
                      <span className="font-medium">Scope: </span>
                      {milestone.scope}
                    </p>
                  )}
                  {milestone.definitionOfDone && (
                    <p className="mt-1 text-sm text-muted">
                      <span className="font-medium">Done when: </span>
                      {milestone.definitionOfDone}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={progress.progressPercent} />
                    <span className="shrink-0 text-xs text-muted">
                      {progress.doneTasks}/{progress.totalTasks} ·{" "}
                      {daysLabel(daysLeft(milestone, today))}
                    </span>
                  </div>

                  {milestone.review && (
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted">Review:</span>
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
                    </p>
                  )}

                  {milestone.tasks.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {milestone.tasks.map((task) => (
                        <li
                          key={task.id}
                          className="flex flex-wrap items-center gap-2 text-sm"
                        >
                          <StatusBadge
                            label={taskStatusLabel[task.status as TaskStatus]}
                            tone={taskStatusTone[task.status as TaskStatus]}
                          />
                          <span>{task.title}</span>
                          {task.priority === "HIGH" && (
                            <StatusBadge
                              label={priorityLabel[task.priority as Priority]}
                              tone={priorityTone[task.priority as Priority]}
                            />
                          )}
                          {task.due && (
                            <span className="text-xs text-muted">
                              due {toDateInput(task.due)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {milestone.deliverables.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted">
                        Deliverables
                      </p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {milestone.deliverables.map((deliverable) => (
                          <li key={deliverable.id}>
                            <span className="sr-only">
                              {deliverable.doneAt ? "Done: " : "Not done: "}
                            </span>
                            <span
                              aria-hidden="true"
                              className={
                                deliverable.doneAt
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted"
                              }
                            >
                              {deliverable.doneAt ? "✓ " : "○ "}
                            </span>
                            {deliverable.url ? (
                              <a
                                href={deliverable.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                              >
                                {deliverable.title}
                              </a>
                            ) : (
                              <span>{deliverable.title}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="meetings-heading" className="mt-10">
        <h2 id="meetings-heading" className="text-lg font-medium">
          Meetings
        </h2>

        {project.meetings.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No meetings logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {project.meetings.map((meeting) => (
              <li key={meeting.id} className="rounded-lg border border-edge p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {toDateInput(meeting.date)}
                  </span>
                  {meeting.nextMeetingDate && (
                    <span className="text-xs text-muted">
                      Next: {toDateInput(meeting.nextMeetingDate)}
                    </span>
                  )}
                </div>
                {meeting.itemsDiscussed && (
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {meeting.itemsDiscussed}
                  </p>
                )}
                {meeting.achievements && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium">Achievements: </span>
                    {meeting.achievements}
                  </p>
                )}
                {meeting.problems && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium">Problems: </span>
                    {meeting.problems}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-12 border-t border-edge pt-4 text-xs text-muted">
        Shared by the project owner. Comments and private notes are not shown
        here.
      </footer>
    </main>
  );
}
