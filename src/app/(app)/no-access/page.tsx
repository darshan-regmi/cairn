import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "No access · FYP Planner",
  robots: { index: false, follow: false },
};

export default function NoAccessPage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-24 text-center"
    >
      <p className="text-sm font-medium text-muted">403</p>
      <h1 className="mt-2 text-2xl tracking-tight">
        You don&rsquo;t have access
      </h1>
      <p className="mt-2 text-sm text-muted">
        This project isn&rsquo;t shared with your account. If it should be, ask
        the project owner to invite you.
      </p>
      <Link
        href="/projects"
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        Back to your dashboard
      </Link>
    </main>
  );
}
