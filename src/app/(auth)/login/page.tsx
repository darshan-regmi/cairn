import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/projects");

  const { registered } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-muted">
          Continue planning your final year project.
        </p>
      </div>

      {registered && (
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          Account created. You can log in now.
        </p>
      )}

      <LoginForm />

      <p className="text-center text-sm text-muted">
        No account yet?{" "}
        <a href="/signup" className="text-accent underline underline-offset-4">
          Create one
        </a>
      </p>
    </div>
  );
}