import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  findCommentsReadAt,
  findDashboardForUser,
  listCompletedProjectsForUser,
} from "@/lib/data";
import { pickActiveWork, summarizeDashboard } from "@/lib/dashboard";
import { markCommentsReadAction } from "@/actions/dashboard";
import { daysLeft, toDateInput } from "@/lib/milestone-metrics";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  milestoneStatusLabel,
  milestoneStatusTone,
  priorityLabel,
  priorityTone,
  type MilestoneStatus,
  type Priority,
} from "@/lib/status";

function daysLeftLabel(days: number): string {
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  if (days === -1) return "1 day late";
  return `${-days} days late`;
}

function dueLabel(days: number): string {
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day late";
  return `${-days} days late`;
}

function Stat({
  label,
  value,
  hint,
  alert = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl tracking-tight ${
          alert ? "text-red-700 dark:text-red-400" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { project: requestedId } = await searchParams;
  const [projects, archived, readState] = await Promise.all([
    findDashboardForUser(session.user.id),
    listCompletedProjectsForUser(session.user.id),
    findCommentsReadAt(session.user.id),
  ]);

  const today = new Date();
  const project =
    projects.find((item) => item.id === requestedId) ?? projects[0] ?? null;

  if (!project) {
    return (
      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-12">
        <header className="page-enter">
          <h1 className="text-2xl tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Your focus view. Once a project is in progress it appears here.
          </p>
        </header>

        <section className="mt-10 rounded-lg border border-dashed border-edge p-10 text-center">
          <h2 className="text-base font-medium">No project in progress</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create a project to start planning. When you mark it complete it
            moves to your archive, and this space opens up again.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/projects"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink motion-safe:active:scale-[0.97]"
            >
              Go to projects
            </Link>
            {archived.length > 0 && (
              <Link
                href="/projects#archived"
                className="rounded-md border border-edge px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {archived.length} archived{" "}
                {archived.length === 1 ? "project" : "projects"}
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  const dashboard = summarizeDashboard(
    [project],
    today,
    undefined,
    readState?.commentsReadAt ?? null,
  );
  const activeWork = pickActiveWork(project.milestones, today);
  const projectDaysLeft = daysLeft({ plannedEnd: project.endDate }, today);
  const behind = [...dashboard.overdue, ...dashboard.blocked];

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-12">
      <header className="page-enter">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              In progress
            </p>
            <h1 className="mt-1 truncate text-2xl tracking-tight">
              {project.title}
            </h1>
          </div>
          <Link
            href="/projects"
            className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            All projects
          </Link>
        </div>

        {project.goal && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {project.goal}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span>
            {toDateInput(project.startDate)} → {toDateInput(project.endDate)}
          </span>
          <span
            className={
              projectDaysLeft < 0
                ? "font-medium text-red-700 dark:text-red-400"
                : ""
            }
          >
            {daysLeftLabel(projectDaysLeft)}
          </span>
        </div>
      </header>

      {projects.length > 1 && (
        <nav
          aria-label="Switch active project"
          className="mt-6 flex flex-wrap gap-2"
        >
          {projects.map((item) => {
            const selected = item.id === project.id;
            return (
              <Link
                key={item.id}
                href={`/dashboard?project=${item.id}`}
                aria-current={selected ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  selected
                    ? "border-accent bg-accent/10 text-fg"
                    : "border-edge text-muted hover:border-accent/50 hover:text-fg"
                }`}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      )}

      <section
        aria-label="At a glance"
        className="stagger-list mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat
          label="Milestones"
          value={project.milestones.length}
          hint={`${project.milestones.filter((m) => m.status === "DONE").length} done`}
        />
        <Stat
          label="Tasks done"
          value={`${dashboard.progress.doneTasks}/${dashboard.progress.totalTasks}`}
          hint={`${dashboard.progress.progressPercent}% complete`}
        />
        <Stat
          label="Overdue"
          value={dashboard.overdue.length}
          alert={dashboard.overdue.length > 0}
          hint={behind.length > 0 ? `${behind.length} needing attention` : "On track"}
        />
        <Stat
          label="Project ends"
          value={projectDaysLeft >= 0 ? `${projectDaysLeft}d` : `${-projectDaysLeft}d late`}
          alert={projectDaysLeft < 0}
          hint={toDateInput(project.endDate)}
        />
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="now-heading" className="page-enter">
          <h2 id="now-heading" className="text-lg font-medium">
            In progress now
          </h2>

          {activeWork.milestone ? (
            <article className="mt-4 rounded-lg border border-accent/40 bg-accent/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/projects/${project.id}/milestones/${activeWork.milestone.id}`}
                  className="font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {activeWork.milestone.name}
                </Link>
                <StatusBadge
                  label={
                    milestoneStatusLabel[
                      activeWork.milestone.status as MilestoneStatus
                    ]
                  }
                  tone={
                    milestoneStatusTone[
                      activeWork.milestone.status as MilestoneStatus
                    ]
                  }
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {activeWork.milestone.plannedStart
                  ? `${toDateInput(activeWork.milestone.plannedStart)} → `
                  : ""}
                {toDateInput(activeWork.milestone.plannedEnd)} ·{" "}
                {daysLeftLabel(activeWork.milestone.daysUntilEnd)}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={activeWork.milestone.progress.progressPercent} />
                <span className="shrink-0 text-xs text-muted">
                  {activeWork.milestone.progress.doneTasks}/
                  {activeWork.milestone.progress.totalTasks}
                </span>
              </div>
            </article>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No phase is in progress yet. Set a milestone to “In progress” to
              focus it here.
            </p>
          )}

          <h3 className="mt-6 text-sm font-medium text-muted">
            Tasks being worked on
          </h3>
          {activeWork.tasks.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing is in progress right now.
            </p>
          ) : (
            <ul className="stagger-list mt-3 space-y-3">
              {activeWork.tasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-lg border border-edge bg-surface p-4 card-hover"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={priorityLabel[task.priority as Priority]}
                      tone={priorityTone[task.priority as Priority]}
                    />
                    <span className="text-sm font-medium">{task.title}</span>
                    {task.overdue && <StatusBadge label="Overdue" tone="red" />}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {task.due
                      ? `${dueLabel(task.daysUntilDue ?? 0)} · ${toDateInput(task.due)} · `
                      : ""}
                    {task.milestoneName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="due-heading" className="page-enter">
          <h2 id="due-heading" className="text-lg font-medium">
            Due this week
          </h2>
          {dashboard.dueSoon.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nothing due in the next seven days.
            </p>
          ) : (
            <ul className="stagger-list mt-4 space-y-3">
              {dashboard.dueSoon.map((task) => (
                <li
                  key={task.id}
                  className="rounded-lg border border-edge bg-surface p-4 card-hover"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={priorityLabel[task.priority as Priority]}
                      tone={priorityTone[task.priority as Priority]}
                    />
                    <span className="text-sm font-medium">{task.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {dueLabel(task.daysUntilDue)} · {toDateInput(task.due)}
                  </p>
                  <Link
                    href={`/projects/${project.id}/milestones/${task.milestoneId}`}
                    aria-label={`Open board for ${task.title}`}
                    className="mt-1 inline-block text-xs text-accent transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Open board
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {dashboard.unreadComments.length > 0 && (
        <section
          aria-labelledby="unread-heading"
          className="page-enter mt-10 rounded-lg border border-accent/40 bg-accent/5 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="unread-heading" className="text-lg font-medium">
                Supervisor comments
              </h2>
              <p className="mt-1 text-sm text-muted">
                {dashboard.unreadComments.length} new{" "}
                {dashboard.unreadComments.length === 1 ? "comment" : "comments"}{" "}
                since you last looked.
              </p>
            </div>
            <form action={markCommentsReadAction}>
              <button
                type="submit"
                className="rounded-md border border-edge bg-canvas px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Mark all as read
              </button>
            </form>
          </div>

          <ul className="stagger-list mt-4 space-y-3">
            {dashboard.unreadComments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-lg border border-edge bg-canvas p-4"
              >
                <p className="text-sm">{comment.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {comment.authorName ?? comment.authorEmail} ·{" "}
                  {toDateInput(comment.createdAt)}
                </p>
                <Link
                  href={comment.link}
                  className="mt-1 inline-block text-xs text-accent transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
