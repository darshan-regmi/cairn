import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getAuthProvider } from "@/lib/auth-provider";
import { isSignupAllowed } from "@/lib/config";
import { deploymentMode } from "@/lib/deployment";
import { safeCallbackUrl } from "@/lib/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const mode = deploymentMode();
  // A brand-new self-host install has no accounts: send the first visitor to
  // create the admin account instead of showing a form that cannot be used.
  if (mode === "selfhost" && (await (await getAuthProvider()).needsSetup())) {
    redirect("/setup");
  }

  const { callbackUrl } = await searchParams;
  const callback = safeCallbackUrl(callbackUrl);
  const signupAllowed = isSignupAllowed();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Create account</h1>
        <p className="text-sm text-muted">
          Your project, organised in one place.
        </p>
      </div>

      {signupAllowed ? (
        <SignUpForm callbackUrl={callback} mode={mode} />
      ) : (
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          Sign-ups are closed. Ask the admin to invite you.
        </p>
      )}

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={
            callback
              ? `/login?callbackUrl=${encodeURIComponent(callback)}`
              : "/login"
          }
          className="rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
