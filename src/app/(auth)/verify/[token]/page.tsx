import Link from "next/link";
import { notFound } from "next/navigation";
import { isSelfHost } from "@/lib/deployment";
import { readEmailToken } from "@/lib/tokens";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

// Self-host only: in cloud mode Firebase hosts its own verification links.
export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isSelfHost()) notFound();

  const { token } = await params;
  const usable = readEmailToken(token) !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Verify your email</h1>
        {!usable && (
          <p className="text-sm text-muted">
            This link has expired or was already used. You can ask for a new one
            by logging in.
          </p>
        )}
      </div>

      {usable ? (
        <VerifyEmailForm token={token} />
      ) : (
        <Link
          href="/login"
          className="block w-full rounded-md border border-edge px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to log in
        </Link>
      )}
    </div>
  );
}
