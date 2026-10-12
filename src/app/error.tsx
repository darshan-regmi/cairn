"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Surface the error in the browser console; the digest is what a self-hoster
    // can match against the server logs.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium text-muted">500</p>
      <h1 className="mt-2 text-2xl tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        An unexpected error stopped this page from loading. Trying again often
        helps.
      </p>
      {error.digest && (
        <p className="mt-4 text-xs text-muted">
          Request id:{" "}
          <code className="font-mono text-fg">{error.digest}</code>
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-edge px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
