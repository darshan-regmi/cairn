import Link from "next/link";
import { isSelfHost } from "@/lib/deployment";
import { safeCallbackUrl } from "@/lib/navigation";
import { CheckEmailPanel } from "@/components/auth/CheckEmailPanel";

// Reads runtime env (deployment mode), so it must render per request — a
// build-time static page would bake the cloud panel into the self-host image.
export const dynamic = "force-dynamic";

/** Where a brand-new account lands until its email address is confirmed. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; callbackUrl?: string }>;
}) {
  const { email, callbackUrl } = await searchParams;
  const callback = safeCallbackUrl(callbackUrl);
  const loginHref = callback
    ? `/login?callbackUrl=${encodeURIComponent(callback)}`
    : "/login";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Verify your email</h1>
        {isSelfHost() && (
          <p className="text-sm text-muted">
            Open the verification link we sent{email ? ` to ${email}` : ""}. You
            will be taken to the login page once it is confirmed.
          </p>
        )}
      </div>

      {isSelfHost() ? (
        <Link
          href={loginHref}
          className="block w-full rounded-md border border-edge px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to log in
        </Link>
      ) : (
        <CheckEmailPanel email={email} callbackUrl={callback} />
      )}
    </div>
  );
}
