import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found · FYP Planner",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-2 text-2xl tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted">
        The page you were looking for isn&rsquo;t here. It may have been moved or
        removed.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/projects"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="rounded-md border border-edge px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
