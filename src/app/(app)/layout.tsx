import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-edge bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/projects"
              className="text-sm font-semibold tracking-tight text-fg"
            >
              FYP Planner
            </Link>
            <nav aria-label="Primary">
              <Link
                href="/projects"
                className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-accent/10 hover:text-fg"
              >
                Projects
              </Link>
            </nav>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="flex items-center gap-3"
          >
            <span className="hidden text-xs text-muted sm:inline">
              {session.user.email}
            </span>
            <button
              type="submit"
              className="rounded-md border border-edge px-3 py-1.5 text-sm text-fg transition-colors hover:bg-accent/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}