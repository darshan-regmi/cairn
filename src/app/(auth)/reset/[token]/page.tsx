import Link from "next/link";
import { notFound } from "next/navigation";
import { isSelfHost } from "@/lib/deployment";
import { readResetToken } from "@/lib/tokens";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

// Cloud mode sends reset links through Firebase, which owns its own page.
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isSelfHost()) notFound();

  const { token } = await params;
  const usable = readResetToken(token) !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Choose a new password</h1>
        {!usable && (
          <p className="text-sm text-muted">
            This reset link has expired or was already used. Request a new one
            from the log in page.
          </p>
        )}
      </div>

      {usable ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Link
          href="/reset"
          className="block w-full rounded-md border border-edge px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Request a new link
        </Link>
      )}
    </div>
  );
}
