import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashResetToken, isResetUsable } from "@/lib/reset";
import { CompleteResetForm } from "@/components/auth/CompleteResetForm";

export default async function ResetTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token } = await params;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { expiresAt: true, usedAt: true },
  });
  const usable = record !== null && isResetUsable(record);

  if (!usable) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight">Reset link not valid</h1>
          <p className="text-sm text-muted">
            This link is invalid, has expired, or has already been used. Request
            a new one to continue.
          </p>
        </div>

        <Link
          href="/reset"
          className="block w-full rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          Request a new link
        </Link>

        <p className="text-center text-sm text-muted">
          <Link
            href="/login"
            className="rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted">
          This link works once and expires an hour after it was created.
        </p>
      </div>

      <CompleteResetForm token={token} />
    </div>
  );
}
