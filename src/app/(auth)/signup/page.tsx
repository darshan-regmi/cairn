import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isSignupAllowed } from "@/lib/config";
import { safeCallbackUrl } from "@/lib/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;
  const callback = safeCallbackUrl(callbackUrl);

  if (!isSignupAllowed()) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight">Sign-ups are closed</h1>
          <p className="text-sm text-muted">
            This planner isn&rsquo;t accepting new accounts right now. If you
            were invited to a project, ask the owner to send you an invite link.
          </p>
        </div>

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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Create account</h1>
        <p className="text-sm text-muted">
          Your final year project, organised in one place.
        </p>
      </div>

      <SignUpForm callbackUrl={callback} />

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
