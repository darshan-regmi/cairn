import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/data";
import { toDateInput } from "@/lib/milestone-metrics";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const projects = await listProjectsForUser(session.user.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted">
          Each project has its own milestones and task board.
        </p>
      </header>

      <CreateProjectForm />

      {projects.length === 0 ? (
        <section className="mt-16 rounded-lg border border-dashed border-edge p-10 text-center">
          <h2 className="text-lg font-medium">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create your first project above, add milestones, then break each
            milestone into tasks on the kanban board.
          </p>
        </section>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <a
                href={`/projects/${project.id}`}
                className="group block rounded-lg border border-edge p-5 transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <h2 className="font-medium transition-colors group-hover:text-accent">
                  {project.title}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {toDateInput(project.startDate)} →{" "}
                  {toDateInput(project.endDate)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {project._count.milestones}{" "}
                  {project._count.milestones === 1 ? "milestone" : "milestones"}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}