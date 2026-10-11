import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Documentation · FYP Planner",
  description:
    "How to plan a final year project with FYP Planner: milestones, tasks, meetings, questions, evidence and supervisor access.",
};

const quietLink =
  "rounded text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const accentButton =
  "rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink";
const inlineLink =
  "rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const sections = [
  ["getting-started", "Getting started"],
  ["dashboard", "The dashboard"],
  ["timeline", "Milestones and the timeline"],
  ["board", "Tasks and the board"],
  ["meetings", "Meetings and agreed actions"],
  ["questions", "Question board"],
  ["evidence", "Evidence"],
  ["reviews", "Reviews"],
  ["supervisors", "Supervisor access and sharing"],
  ["import", "Importing a CSV"],
  ["account", "Account and sign-in"],
  ["self-hosting", "Self-hosting"],
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-edge py-10">
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
        {children}
      </div>
    </section>
  );
}

export default async function DocsPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <Link
          href="/"
          className="font-display text-lg tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          FYP Planner
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <Link href="/" className={quietLink}>
            Home
          </Link>
          <Link href={signedIn ? "/projects" : "/login"} className={accentButton}>
            {signedIn ? "Go to dashboard" : "Log in"}
          </Link>
        </nav>
      </header>

      <div className="py-10">
        <h1 className="font-display text-3xl tracking-tight">Documentation</h1>
        <p className="mt-3 text-muted">
          FYP Planner keeps a final year project in one place: the plan, the
          work, the conversations with your supervisor, and the evidence that
          proves it is done.
        </p>
      </div>

      <nav aria-label="On this page" className="border-t border-edge py-8">
        <h2 className="text-sm font-medium">On this page</h2>
        <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {sections.map(([id, title]) => (
            <li key={id}>
              <a href={`#${id}`} className={inlineLink}>
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="getting-started" title="Getting started">
        <p>
          Create an account from the sign-up page, or open an invite link a
          project owner has sent you. Whoever runs the app can switch sign-ups
          off once their own account exists.
        </p>
        <p>
          Then create a project with a start and end date. A project holds
          milestones; a milestone holds tasks.
        </p>
      </Section>

      <Section id="dashboard" title="The dashboard">
        <p>
          The dashboard is your starting point. It shows every project you
          belong to with a progress bar, and calls out:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>work that is behind schedule — overdue and blocked tasks;</li>
          <li>tasks due within the next seven days;</li>
          <li>milestones coming up;</li>
          <li>prep for your latest meeting, including its open actions;</li>
          <li>questions still waiting on a decision; and</li>
          <li>new comments from your supervisor, which you can mark as read.</li>
        </ul>
      </Section>

      <Section id="timeline" title="Milestones and the timeline">
        <p>
          Each milestone has a status — <strong>Planned</strong>,{" "}
          <strong>In progress</strong>, <strong>Done</strong> or{" "}
          <strong>Slipped</strong> — plus planned start and end dates.
        </p>
        <p>
          On the project timeline you can reorder milestones with the move
          controls and reschedule them by giving new dates. You can also give a
          milestone a <strong>scope</strong> and a{" "}
          <strong>definition of done</strong>, and list{" "}
          <strong>deliverables</strong>: a checklist of concrete outputs, each
          with an optional link.
        </p>
      </Section>

      <Section id="board" title="Tasks and the board">
        <p>
          Open a milestone to see its board. A task has a status —{" "}
          <strong>To do</strong>, <strong>In progress</strong>,{" "}
          <strong>Blocked</strong> or <strong>Done</strong> — a priority (
          <strong>High</strong>, <strong>Medium</strong>, <strong>Low</strong>)
          and an optional due date.
        </p>
        <p>
          Move cards between columns as work progresses. Tasks record where they
          came from, so a card created from a meeting action or a question stays
          traceable.
        </p>
      </Section>

      <Section id="meetings" title="Meetings and agreed actions">
        <p>
          Log a supervisor meeting with its date, the problems raised, the
          actions you agreed, and when you next meet. Each agreed action can be
          turned into a board task in one click.
        </p>
        <p>
          The dashboard surfaces your most recent meeting so you can walk in
          prepared.
        </p>
      </Section>

      <Section id="questions" title="Question board">
        <p>
          Keep questions in the open until they are decided. A question is{" "}
          <strong>Open</strong>, <strong>Adopted</strong>,{" "}
          <strong>Parked</strong> or <strong>Dropped</strong>, and the board
          groups them by status with a count for each.
        </p>
      </Section>

      <Section id="evidence" title="Evidence">
        <p>
          Attach evidence to a milestone: a type (<strong>Demo</strong>,{" "}
          <strong>Screenshot</strong>, <strong>Test result</strong>,{" "}
          <strong>Benchmark</strong>, <strong>Commit / PR</strong> or{" "}
          <strong>Supervisor feedback</strong>), a title and a link. Links must
          be <code className="font-mono text-fg">http(s)</code> addresses.
        </p>
      </Section>

      <Section id="reviews" title="Reviews">
        <p>
          Record a review verdict for a milestone — <strong>On track</strong>,{" "}
          <strong>Partly met</strong> or <strong>Off track</strong> — so the
          timeline reflects how the work is really going.
        </p>
      </Section>

      <Section id="supervisors" title="Supervisor access and sharing">
        <p>
          Invite a supervisor by email. No mail server is needed: you get a link
          to send them yourself. A supervisor can view a project and leave
          comments, but never edit, move or delete anything.
        </p>
        <p>
          You can also create a read-only share link that needs no account at
          all, and set it to expire. Comments can be left on milestones, tasks,
          meetings, questions, evidence and reviews.
        </p>
      </Section>

      <Section id="import" title="Importing a CSV">
        <p>
          If you already have a plan in a spreadsheet, import it as a CSV from
          the dashboard to create milestones and tasks in one go.
        </p>
      </Section>

      <Section id="account" title="Account and sign-in">
        <p>
          Forgot your password? Start a reset from the log-in page. With no mail
          server configured, the reset link is shown for you to copy and open.
          It works once and expires after an hour.
        </p>
      </Section>

      <Section id="self-hosting" title="Self-hosting">
        <p>FYP Planner is configured entirely through environment variables:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code className="font-mono text-fg">DATABASE_URL</code> — the
            PostgreSQL connection string.
          </li>
          <li>
            <code className="font-mono text-fg">AUTH_SECRET</code> — the session
            signing secret.
          </li>
          <li>
            <code className="font-mono text-fg">ALLOW_SIGNUP</code> — set to{" "}
            <code className="font-mono text-fg">false</code> to close
            registration once your own account exists.
          </li>
        </ul>
        <p>
          Apply the database schema with{" "}
          <code className="font-mono text-fg">npx prisma migrate deploy</code>{" "}
          before starting the app.
        </p>
      </Section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-edge py-8 text-sm text-muted">
        <p>FYP Planner</p>
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link href="/" className={quietLink}>
            Home
          </Link>
          <Link href={signedIn ? "/projects" : "/login"} className={quietLink}>
            {signedIn ? "Dashboard" : "Log in"}
          </Link>
        </nav>
      </footer>
    </main>
  );
}
