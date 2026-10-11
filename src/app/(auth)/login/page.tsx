import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isSignupAllowed } from "@/lib/config";
import { safeCallbackUrl } from "@/lib/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/projects");

  const { registered, reset, callbackUrl } = await searchParams;
  const callback = safeCallbackUrl(callbackUrl);
  const signupAllowed = isSignupAllowed();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Log in</h1>
        <p className="text-sm text-muted">
          Continue planning your final year project.
        </p>
      </div>

      {registered && (
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          Account created. You can log in now.
        </p>
      )}

      {reset && (
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          Password updated. Log in with your new password.
        </p>
      )}

      <LoginForm callbackUrl={callback} />

      <p className="text-center text-sm text-muted">
        <Link
          href="/reset"
          className="rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Forgot your password?
        </Link>
      </p>

      {signupAllowed && (
        <p className="text-center text-sm text-muted">
          No account yet?{" "}
          <Link
            href={
              callback
                ? `/signup?callbackUrl=${encodeURIComponent(callback)}`
                : "/signup"
            }
            className="rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Create one
          </Link>
        </p>
      )}
    </div>
  );
}