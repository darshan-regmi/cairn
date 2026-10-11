import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  findCommentsReadAt,
  findDashboardForUser,
  listArchivedProjectsForUser,
  listSupervisedProjectsForUser,
} from "@/lib/data";
import { summarizeDashboard } from "@/lib/dashboard";
import { markCommentsReadAction } from "@/actions/dashboard";
import { toDateInput } from "@/lib/milestone-metrics";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  priorityLabel,
  priorityTone,
  taskStatusLabel,
  taskStatusTone,
  type Priority,
  type TaskStatus,
} from "@/lib/status";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ImportCsvForm } from "@/components/projects/ImportCsvForm";
import {
  ArchiveProjectButton,
  RestoreProjectButton,
} from "@/components/projects/ProjectArchiveControls";

function daysUntilLabel(days: number): string {
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function daysLateLabel(days: number): string {
  if (days === 1) return "1 day late";
  return `${days} days late`;
}

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number | string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-lg border border-edge p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl tracking-tight ${
          alert ? "text-red-700 dark:text-red-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [projects, supervised, readState, archived] = await Promise.all([
    findDashboardForUser(session.user.id),
    listSupervisedProjectsForUser(session.user.id),
    findCommentsReadAt(session.user.id),
    listArchivedProjectsForUser(session.user.id),
  ]);

  const dashboard = summarizeDashboard(
    projects,
    new Date(),
    undefined,
    readState?.commentsReadAt ?? null,
  );
  const hasProjects = dashboard.projectCount > 0;
  const behind = [...dashboard.overdue, ...dashboard.blocked];

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-12">
      <header>
        <h1 className="text-2xl tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Progress, overdue work, and upcoming milestones across your projects.
        </p>
      </header>

      {hasProjects && (
        <>
          <section
            aria-label="At a glance"
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Stat label="Projects" value={dashboard.projectCount} />
            <Stat label="Milestones" value={dashboard.milestoneCount} />
            <Stat
              label="Tasks done"
              value={`${dashboard.progress.doneTasks}/${dashboard.progress.totalTasks}`}
            />
            <Stat
              label="Overdue"
              value={dashboard.overdue.length}
              alert={dashboard.overdue.length > 0}
            />
          </section>

          {dashboard.unreadComments.length > 0 && (
            <section
              aria-labelledby="unread-heading"
              className="mt-10 rounded-lg border border-accent/40 bg-accent/5 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="unread-heading" className="text-lg font-medium">
                    Supervisor comments
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {dashboard.unreadComments.length} new{" "}
                    {dashboard.unreadComments.length === 1
                      ? "comment"
                      : "comments"}{" "}
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

              <ul className="mt-4 space-y-3">
                {dashboard.unreadComments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-lg border border-edge bg-canvas p-4"
                  >
                    <p className="text-sm">{comment.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {comment.authorName ?? comment.authorEmail} ·{" "}
                      {comment.projectTitle} ·{" "}
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

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {behind.length > 0 && (
              <section aria-labelledby="behind-heading">
                <h2 id="behind-heading" className="text-lg font-medium">
                  Behind schedule
                </h2>
                <ul className="mt-4 space-y-3">
                  {dashboard.overdue.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-edge p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={priorityLabel[task.priority as Priority]}
                          tone={priorityTone[task.priority as Priority]}
                        />
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        <span className="font-medium text-red-700 dark:text-red-400">
                          {daysLateLabel(task.daysLate)}
                        </span>{" "}
                        · {task.projectTitle} · {task.milestoneName}
                      </p>
                      <Link
                        href={`/projects/${task.projectId}/milestones/${task.milestoneId}`}
                        aria-label={`Open board for ${task.title}`}
                        className="mt-1 inline-block text-xs text-accent transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Open board
                      </Link>
                    </li>
                  ))}
                  {dashboard.blocked.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-edge p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={priorityLabel[task.priority as Priority]}
                          tone={priorityTone[task.priority as Priority]}
                        />
                        <span className="text-sm font-medium">{task.title}</span>
                        <StatusBadge label="Blocked" tone="amber" />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {task.projectTitle} · {task.milestoneName}
                      </p>
                      <Link
                        href={`/projects/${task.projectId}/milestones/${task.milestoneId}`}
                        aria-label={`Open board for ${task.title}`}
                        className="mt-1 inline-block text-xs text-accent transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Open board
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="due-soon-heading">
              <h2 id="due-soon-heading" className="text-lg font-medium">
                Due this week
              </h2>
              {dashboard.dueSoon.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Nothing due in the next seven days.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {dashboard.dueSoon.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-edge p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={priorityLabel[task.priority as Priority]}
                          tone={priorityTone[task.priority as Priority]}
                        />
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {daysUntilLabel(task.daysUntilDue)} ·{" "}
                        {toDateInput(task.due)} · {task.projectTitle} ·{" "}
                        {task.milestoneName}
                      </p>
                      <Link
                        href={`/projects/${task.projectId}/milestones/${task.milestoneId}`}
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

            <section aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="text-lg font-medium">
                Coming up
              </h2>
              {dashboard.upcoming.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  No upcoming milestones.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {dashboard.upcoming.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="rounded-lg border border-edge p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/projects/${milestone.projectId}/milestones/${milestone.id}`}
                          className="text-sm font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {milestone.name}
                        </Link>
                        <span className="text-xs text-muted">
                          {daysUntilLabel(milestone.daysUntilEnd)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {milestone.projectTitle} · ends{" "}
                        {toDateInput(milestone.plannedEnd)}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <ProgressBar value={milestone.progress.progressPercent} />
                        <span className="shrink-0 text-xs text-muted">
                          {milestone.progress.doneTasks}/
                          {milestone.progress.totalTasks}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {dashboard.meetingPrep.length > 0 && (
              <section aria-labelledby="meeting-prep-heading">
                <h2 id="meeting-prep-heading" className="text-lg font-medium">
                  Meeting prep
                </h2>
                <ul className="mt-4 space-y-3">
                  {dashboard.meetingPrep.map((meeting) => (
                    <li
                      key={meeting.id}
                      className="rounded-lg border border-edge p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {toDateInput(meeting.date)} · {meeting.projectTitle}
                        </span>
                        {meeting.nextMeetingDate && (
                          <span className="text-xs text-muted">
                            Next {toDateInput(meeting.nextMeetingDate)}
                          </span>
                        )}
                      </div>
                      {meeting.problems && (
                        <p className="mt-2 text-sm text-muted">
                          <span className="font-medium">Problems: </span>
                          {meeting.problems}
                        </p>
                      )}
                      {meeting.actionItems.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {meeting.actionItems.map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <span>{item.text}</span>
                              {item.taskStatus ? (
                                <StatusBadge
                                  label={
                                    taskStatusLabel[item.taskStatus as TaskStatus]
                                  }
                                  tone={
                                    taskStatusTone[item.taskStatus as TaskStatus]
                                  }
                                />
                              ) : (
                                <span className="text-xs text-muted">
                                  not on the board
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href={`/projects/${meeting.projectId}/meetings`}
                        className="mt-2 inline-block text-xs text-accent transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Open meeting log
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {dashboard.openQuestions.length > 0 && (
              <section aria-labelledby="open-questions-heading">
                <h2 id="open-questions-heading" className="text-lg font-medium">
                  Waiting on a decision
                </h2>
                <ul className="mt-4 space-y-3">
                  {dashboard.openQuestions.map((question) => (
                    <li
                      key={question.id}
                      className="rounded-lg border border-edge p-4"
                    >
                      <Link
                        href={`/projects/${question.projectId}/questions`}
                        className="text-sm font-medium text-fg transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {question.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        Raised {toDateInput(question.raisedAt)} ·{" "}
                        {question.projectTitle}
                        {question.milestoneName
                          ? ` · ${question.milestoneName}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )}

      <section aria-labelledby="projects-heading" className="mt-12">
        <h2 id="projects-heading" className="text-lg font-medium">
          Your projects
        </h2>

        <CreateProjectForm />
        <ImportCsvForm />

        {dashboard.projects.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-edge p-10 text-center">
            <h3 className="text-base font-medium">No projects yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Create your first project above, add milestones, then break each
              milestone into tasks on the kanban board.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.projects.map((project) => (
              <li
                key={project.id}
                className="group flex flex-col rounded-lg border border-edge transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="block flex-1 rounded-t-lg p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <h3 className="font-medium transition-colors group-hover:text-accent">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    {toDateInput(project.startDate)} →{" "}
                    {toDateInput(project.endDate)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={project.progress.progressPercent} />
                    <span className="shrink-0 text-xs text-muted">
                      {project.progress.progressPercent}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {project.milestoneCount}{" "}
                    {project.milestoneCount === 1 ? "milestone" : "milestones"}
                  </p>
                </Link>
                <div className="border-t border-edge px-5 py-2">
                  <ArchiveProjectButton
                    projectId={project.id}
                    className="rounded text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section aria-labelledby="archived-heading" className="mt-12">
          <h2 id="archived-heading" className="text-lg font-medium">
            Archived projects
          </h2>
          <p className="mt-1 text-sm text-muted">
            Hidden from your dashboard and not shared. Restore one to bring it
            back.
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((project) => (
              <li
                key={project.id}
                className="flex flex-col rounded-lg border border-dashed border-edge p-5"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {project.title}
                </Link>
                <p className="mt-2 text-sm text-muted">
                  {toDateInput(project.startDate)} →{" "}
                  {toDateInput(project.endDate)}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {project._count.milestones}{" "}
                  {project._count.milestones === 1 ? "milestone" : "milestones"}
                </p>
                <div className="mt-3">
                  <RestoreProjectButton projectId={project.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {supervised.length > 0 && (
        <p className="mt-10 text-sm text-muted">
          You are supervising {supervised.length}{" "}
          {supervised.length === 1 ? "project" : "projects"}.{" "}
          <Link
            href="/supervisor"
            className="text-accent transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open supervised projects
          </Link>
        </p>
      )}
    </main>
  );
}
