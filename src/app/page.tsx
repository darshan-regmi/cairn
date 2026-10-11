import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isSignupAllowed } from "@/lib/config";

export const metadata: Metadata = {
  title: "FYP Planner — plan your final year project",
  description:
    "Milestones, kanban boards, supervisor meetings, questions and evidence in one self-hosted planner.",
};

const features = [
  {
    title: "Milestone timeline",
    body: "Lay out milestones in the order you mean to do them, then move and reschedule when plans change.",
  },
  {
    title: "Kanban boards",
    body: "Each milestone opens as a board so tasks have a home and you can see what is in progress.",
  },
  {
    title: "Meetings & agreed actions",
    body: "Log supervisor meetings, capture problems and next steps, then turn an action into a task.",
  },
  {
    title: "Question board",
    body: "Track open questions until they are adopted, parked or dropped, instead of losing them in notes.",
  },
  {
    title: "Evidence that counts",
    body: "Attach links to the work that proves a milestone is done — repositories, documents and builds.",
  },
  {
    title: "Share and supervise",
    body: "Send a read-only share link, or invite your supervisor to follow progress and leave comments.",
  },
];

const accentButton =
  "rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink";
const outlineButton =
  "rounded-md border border-edge px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const quietLink =
  "rounded text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const signupAllowed = isSignupAllowed();

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-4">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <span className="font-display text-lg tracking-tight">FYP Planner</span>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <Link href="/docs" className={quietLink}>
            Docs
          </Link>
          {signedIn ? (
            <Link href="/projects" className={accentButton}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={quietLink}>
                Log in
              </Link>
              {signupAllowed && (
                <Link href="/signup" className={accentButton}>
                  Create account
                </Link>
              )}
            </>
          )}
        </nav>
      </header>

      <section className="py-16 sm:py-24">
        <p className="text-sm font-medium text-accent">
          Final year projects, in one place
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl tracking-tight sm:text-5xl">
          Plan the project, not the paperwork.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          FYP Planner keeps your timeline, kanban board, supervisor meetings,
          open questions and evidence together — and gives your supervisor a
          clear, read-only view.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {signedIn ? (
            <>
              <Link href="/projects" className={accentButton}>
                Go to dashboard
              </Link>
              <Link href="/docs" className={outlineButton}>
                Read the docs
              </Link>
            </>
          ) : (
            <>
              {signupAllowed && (
                <Link href="/signup" className={accentButton}>
                  Create account
                </Link>
              )}
              <Link
                href="/login"
                className={signupAllowed ? outlineButton : accentButton}
              >
                Log in
              </Link>
              <Link href="/docs" className={outlineButton}>
                Read the docs
              </Link>
            </>
          )}
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="border-t border-edge py-16"
      >
        <h2
          id="features-heading"
          className="font-display text-2xl tracking-tight"
        >
          What&rsquo;s inside
        </h2>
        <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature.title}>
              <h3 className="text-sm font-medium">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-edge py-8 text-sm text-muted">
        <p>Built to self-host. No mail server required.</p>
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link href="/docs" className={quietLink}>
            Docs
          </Link>
          {signedIn ? (
            <Link href="/projects" className={quietLink}>
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className={quietLink}>
              Log in
            </Link>
          )}
        </nav>
      </footer>
    </main>
  );
}
