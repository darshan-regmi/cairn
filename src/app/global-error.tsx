"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-sm font-medium text-muted">500</p>
          <h1 className="mt-2 text-2xl tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            The app hit an unexpected error while loading. You can try again.
          </p>
          {error.digest && (
            <p className="mt-4 text-xs text-muted">
              Request id:{" "}
              <code className="font-mono text-fg">{error.digest}</code>
            </p>
          )}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
