import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listSupervisedProjectsForUser } from "@/lib/data";
import { summarizeSupervisedProjects } from "@/lib/supervisor";
import { toDateInput } from "@/lib/milestone-metrics";
import { StatusBadge } from "@/components/StatusBadge";

export default async function SupervisorHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const projects = summarizeSupervisedProjects(
    await listSupervisedProjectsForUser(session.user.id),
    new Date(),
  );

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-12">
      <header>
        <h1 className="text-2xl tracking-tight">Supervised projects</h1>
        <p className="mt-1 text-sm text-muted">
          Projects you were invited to. You can read everything and leave
          comments.
        </p>
      </header>

      {projects.length === 0 ? (
        <section className="mt-16 rounded-lg border border-dashed border-edge p-10 text-center">
          <h2 className="text-lg font-medium">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            When a student invites you to review their project, it will appear
            here.
          </p>
        </section>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/supervisor/${project.id}`}
                className="group block rounded-lg border border-edge p-5 transition-colors hover:border-accent/50 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-medium transition-colors group-hover:text-accent">
                    {project.title}
                  </h2>
                  <StatusBadge
                    label={project.isBehind ? "Behind" : "On track"}
                    tone={project.isBehind ? "red" : "emerald"}
                  />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {toDateInput(project.startDate)} → {toDateInput(project.endDate)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {project.milestoneCount}{" "}
                  {project.milestoneCount === 1 ? "milestone" : "milestones"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {project.nextMeetingDate
                    ? `Next meeting ${toDateInput(project.nextMeetingDate)}`
                    : "No meeting scheduled"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
