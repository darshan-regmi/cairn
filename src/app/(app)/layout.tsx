import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { listOwnedProjectsForUser } from "@/lib/data";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const projects = await listOwnedProjectsForUser(session.user.id);

  return (
    <AppShell
      userEmail={session.user.email ?? ""}
      role={session.user.role}
      projects={projects.map((project) => ({
        id: project.id,
        title: project.title,
      }))}
      signOut={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      {children}
    </AppShell>
  );
}
