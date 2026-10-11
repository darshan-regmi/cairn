"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  requestPasswordResetAction,
  type RequestResetState,
} from "@/actions/reset";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Starts a password reset. No SMTP is configured in this build, so once the
 * server logs the link it is also handed back here to copy and open.
 */
export function RequestResetForm() {
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await requestPasswordResetAction(
        { success: false } satisfies RequestResetState,
        formData,
      );
      if (result.success) {
        setSent(true);
        setError(null);
        setResetUrl(
          result.resetUrl ? `${window.location.origin}${result.resetUrl}` : null,
        );
      } else {
        setError(result.error ?? "Could not start the reset.");
      }
    });
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm">
          If an account exists for that address, a reset link has been created.
        </p>
        {resetUrl && (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              Email isn&rsquo;t set up here, so copy this link and open it in
              this browser. It works once and expires in an hour.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={resetUrl}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Password reset link"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(resetUrl);
                }}
                className="shrink-0 rounded-md border border-edge px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Copy
              </button>
            </div>
          </div>
        )}
        <Link
          href="/login"
          className="block w-full rounded-md border border-edge px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="reset-email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        {pending ? "Creating link…" : "Create reset link"}
      </button>
    </form>
  );
}
