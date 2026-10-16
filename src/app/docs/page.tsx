import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { userRoleBlurb } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Documentation · Cairn",
  description:
    "How to plan and run a project with Cairn: milestones, tasks, meetings, questions, evidence and supervisor access.",
};

const quietLink =
  "rounded text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const accentButton =
  "rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink";
const inlineLink =
  "rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const sections = [
  ["getting-started", "Getting started"],
  ["roles", "Roles"],
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
          Cairn
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <Link href="/" className={quietLink}>
            Home
          </Link>
          <Link href={signedIn ? "/dashboard" : "/login"} className={accentButton}>
            {signedIn ? "Go to dashboard" : "Log in"}
          </Link>
        </nav>
      </header>

      <div className="py-10">
        <h1 className="font-display text-3xl tracking-tight">Documentation</h1>
        <p className="mt-3 text-muted">
          Cairn keeps a project in one place: the plan, the work, the
          conversations with your supervisor, and the evidence that proves it
          is done.
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

      <Section id="roles" title="Roles">
        <p>You pick a role when you sign up. It sets what you can do:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Normal user</strong> — {userRoleBlurb.NORMAL}
          </li>
          <li>
            <strong>Student</strong> — {userRoleBlurb.STUDENT}
          </li>
          <li>
            <strong>Supervisor</strong> — {userRoleBlurb.SUPERVISOR}
          </li>
        </ul>
        <p>
          On a project, your rights also depend on whether you own it or were
          invited to it. Supervisors are always invited to a project; they never
          create one.
        </p>
      </Section>

      <Section id="dashboard" title="The dashboard">
        <p>
          The dashboard is your focus view. It shows the one project you are
          working on and calls out:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>how far along the project is, and how many days it has left;</li>
          <li>
            the phase that is in progress, with the tasks being worked on now;
            and
          </li>
          <li>
            tasks due within the next seven days, plus new comments from your
            supervisor.
          </li>
        </ul>
        <p>
          When more than one project is in progress a switcher at the top lets
          you choose which one to focus. The <strong>Projects</strong> page holds
          everything you own: <strong>complete</strong> a project to move it to
          the archive and pause its share link without deleting anything, then{" "}
          <strong>reopen</strong> it any time, or edit and delete projects and
          milestones. There is no separate archive button — finishing a project
          is what archives it.
        </p>
      </Section>

      <Section id="timeline" title="Milestones and the timeline">
        <p>
          Each milestone has a status — <strong>Planned</strong>,{" "}
          <strong>In progress</strong>, <strong>Done</strong> or{" "}
          <strong>Slipped</strong> — plus planned start and end dates.
        </p>
        <p>
          On the project timeline you can reorder milestones with the move
          controls, edit a milestone (its name, goal and dates) or delete it.
          You can also give a milestone a <strong>scope</strong> and a{" "}
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
          Accounts are handled by Firebase Authentication. Signing up sends a
          verification email, and you cannot log in until you open it. Forgot
          your password? Start a reset from the log-in page and Firebase emails
          you a link.
        </p>
        <p>
          A self-hosted install can run without Firebase instead. In that mode
          accounts are stored in its own database: the first visitor creates the
          first account at the setup page, and if email is configured a
          verification link must be opened before the first log-in.
        </p>
      </Section>

      <Section id="self-hosting" title="Self-hosting">
        <p>
          <code className="font-mono text-fg">DEPLOYMENT_MODE</code> chooses where
          accounts live. Leave it as{" "}
          <code className="font-mono text-fg">cloud</code> (the default) to use
          Firebase, or set it to{" "}
          <code className="font-mono text-fg">selfhost</code> to keep accounts in
          your own PostgreSQL database and never contact Firebase.
        </p>
        <p>Cairn is configured entirely through environment variables:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code className="font-mono text-fg">DEPLOYMENT_MODE</code> —{" "}
            <code className="font-mono text-fg">cloud</code> or{" "}
            <code className="font-mono text-fg">selfhost</code>.
          </li>
          <li>
            <code className="font-mono text-fg">DATABASE_URL</code> — the
            PostgreSQL connection string.
          </li>
          <li>
            <code className="font-mono text-fg">SESSION_SECRET</code> — required
            in self-host mode. At least 32 characters; it signs the session
            cookies and the verification and reset links.
          </li>
          <li>
            <code className="font-mono text-fg">APP_URL</code> — the public
            address of your install, used to build verification and reset links.
          </li>
          <li>
            <code className="font-mono text-fg">NEXT_PUBLIC_FIREBASE_*</code> —
            the web config for your Firebase project (cloud mode only).
          </li>
          <li>
            <code className="font-mono text-fg">FIREBASE_SERVICE_ACCOUNT</code>{" "}
            — the Admin SDK key, a file path or the JSON itself (cloud mode
            only).
          </li>
          <li>
            <code className="font-mono text-fg">SMTP_*</code> — optional mail
            server for verification and reset links. Without it those links are
            written to the logs instead.
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
          before starting the app. The published Docker image does this for you
          on startup.
        </p>
      </Section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-edge py-8 text-sm text-muted">
        <p>Cairn</p>
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link href="/" className={quietLink}>
            Home
          </Link>
          <Link href={signedIn ? "/dashboard" : "/login"} className={quietLink}>
            {signedIn ? "Dashboard" : "Log in"}
          </Link>
        </nav>
      </footer>
    </main>
  );
}
