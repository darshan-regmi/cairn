import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  findDashboardForUser,
  listCompletedProjectsForUser,
  listSupervisedProjectsForUser,
} from "@/lib/data";
import { summarizeDashboard } from "@/lib/dashboard";
import { toDateInput } from "@/lib/milestone-metrics";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { projectStatusLabel, projectStatusTone } from "@/lib/status";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ImportCsvForm } from "@/components/projects/ImportCsvForm";
import {
  CompleteProjectButton,
  DeleteProjectButton,
  ReopenProjectButton,
} from "@/components/projects/ProjectStatusControls";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [active, archived, supervised] = await Promise.all([
    findDashboardForUser(session.user.id),
    listCompletedProjectsForUser(session.user.id),
    listSupervisedProjectsForUser(session.user.id),
  ]);
  const summaries = summarizeDashboard(active, new Date()).projects;

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-12">
      <header className="page-enter">
        <h1 className="text-2xl tracking-tight">Projects</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Everything you own. Complete a project to move it to the archive;
          reopen it any time, or delete it for good.
        </p>
      </header>

      <div className="page-enter">
        <CreateProjectForm />
        <ImportCsvForm />
      </div>

      <section aria-labelledby="active-heading" className="mt-12">
        <div className="flex items-center gap-3">
          <h2 id="active-heading" className="text-lg font-medium">
            In progress
          </h2>
          {summaries.length > 0 && (
            <span className="text-sm text-muted">{summaries.length}</span>
          )}
        </div>

        {summaries.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-edge p-10 text-center">
            <h3 className="text-base font-medium">No active projects</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Create your first project above, add milestones, then break each
              milestone into tasks on the kanban board.
            </p>
          </div>
        ) : (
          <ul className="stagger-list mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((project) => (
              <li
                key={project.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-edge bg-surface card-hover"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="flex-1 rounded-t-lg p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium transition-colors group-hover:text-accent">
                      {project.title}
                    </h3>
                    <StatusBadge
                      label={projectStatusLabel.IN_PROGRESS}
                      tone={projectStatusTone.IN_PROGRESS}
                    />
                  </div>
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
                <div className="flex items-center justify-between gap-2 border-t border-edge px-5 py-3">
                  <CompleteProjectButton projectId={project.id} />
                  <DeleteProjectButton
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
        <section
          id="archived"
          aria-labelledby="archived-heading"
          className="mt-12 scroll-mt-20"
        >
          <div className="flex items-center gap-3">
            <h2 id="archived-heading" className="text-lg font-medium">
              Archived
            </h2>
            <span className="text-sm text-muted">{archived.length}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Completed projects, kept for reference. Reopen one to work on it
            again, or delete it permanently.
          </p>
          <ul className="stagger-list mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((project) => (
              <li
                key={project.id}
                className="flex flex-col rounded-lg border border-dashed border-edge p-5 card-hover"
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
                  {project.completedAt
                    ? ` · completed ${toDateInput(project.completedAt)}`
                    : ""}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ReopenProjectButton projectId={project.id} />
                  <DeleteProjectButton projectId={project.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {supervised.length > 0 && (
        <p className="mt-12 text-sm text-muted">
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
