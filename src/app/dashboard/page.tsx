import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const projectCount = await prisma.project.count({
    where: { ownerId: session.user.id },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">
            Signed in as {session.user.email}
            {session.user.name ? ` (${session.user.name})` : ""}.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-edge px-3 py-1.5 text-sm hover:bg-accent/10"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-10 rounded-lg border border-edge bg-accent/5 p-6">
        <h2 className="text-lg font-medium">Phase 0 done.</h2>
        <p className="mt-2 text-sm text-muted">
          Authentication works. You have {projectCount}{" "}
          {projectCount === 1 ? "project" : "projects"} in the database.
        </p>
        <p className="mt-1 text-sm text-muted">
          Phase 1 adds project creation, the milestone timeline, and the kanban
          board.
        </p>
      </section>
    </main>
  );
}