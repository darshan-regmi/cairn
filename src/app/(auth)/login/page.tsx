import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getAuthProvider } from "@/lib/auth-provider";
import { isSignupAllowed } from "@/lib/config";
import { deploymentMode } from "@/lib/deployment";
import { safeCallbackUrl } from "@/lib/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; verified?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const mode = deploymentMode();
  // A brand-new self-host install has no accounts: send the first visitor to
  // create the admin account instead of showing a login form nobody can use.
  if (mode === "selfhost" && (await (await getAuthProvider()).needsSetup())) {
    redirect("/setup");
  }

  const { callbackUrl, verified } = await searchParams;
  const callback = safeCallbackUrl(callbackUrl);
  const signupAllowed = isSignupAllowed();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Log in</h1>
        <p className="text-sm text-muted">
          Continue planning your project.
        </p>
      </div>

      {verified && (
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          Your email is verified. Log in to continue.
        </p>
      )}

      <LoginForm callbackUrl={callback} mode={mode} />

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
