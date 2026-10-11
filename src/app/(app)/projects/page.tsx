import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findDashboardForUser, listSupervisedProjectsForUser } from "@/lib/data";
import { summarizeDashboard } from "@/lib/dashboard";
import { toDateInput } from "@/lib/milestone-metrics";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { priorityLabel, priorityTone, type Priority } from "@/lib/status";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ImportCsvForm } from "@/components/projects/ImportCsvForm";

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

  const [projects, supervised] = await Promise.all([
    findDashboardForUser(session.user.id),
    listSupervisedProjectsForUser(session.user.id),
  ]);

  const dashboard = summarizeDashboard(projects, new Date());
  const hasProjects = dashboard.projectCount > 0;

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

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="overdue-heading">
              <h2 id="overdue-heading" className="text-lg font-medium">
                Needs attention
              </h2>
              {dashboard.overdue.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Nothing is overdue. Nicely on top of it.
                </p>
              ) : (
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
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="group block rounded-lg border border-edge p-5 transition-colors hover:border-accent/50 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
              </li>
            ))}
          </ul>
        )}
      </section>

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
