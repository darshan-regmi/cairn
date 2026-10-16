"use client";

import { useState } from "react";
import Link from "next/link";
import { verifyEmail } from "@/actions/auth";

/** Confirms the address a verification link was sent to. */
export function VerifyEmailForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await verifyEmail(token);
      if (!result.success) {
        setError(
          result.error ?? "This verification link is invalid or has expired.",
        );
        return;
      }

      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          Your email address is verified. You can log in now.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-accent-ink transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        Confirm this address to finish setting up your account.
      </p>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        {pending ? "Verifying…" : "Verify email address"}
      </button>
    </form>
  );
}
