# FYP Planner

A planner for running your whole final year project: milestone timelines, a
kanban task board, supervisor meeting logs, open questions, milestone reviews,
a read-only share link, and evidence collection for the final report and viva.

The app connects the pieces: a task agreed in a meeting can be turned into a
kanban card in one click, an open question can be adopted as a task, and the
planning history becomes material for the final report.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript strict, Turbopack)
- **Tailwind CSS v4** with a small set of design tokens and dark mode support
- **Prisma 7** with PostgreSQL (driver adapter `@prisma/adapter-pg`)
- **Auth.js v5** (NextAuth beta) — email/password via the Credentials provider,
  JWT sessions
- **Zod** — every server action re-validates its input
- **Vitest** + **ESLint** + a **GitHub Actions** CI workflow
- **docker compose** for local PostgreSQL
- **dnd-kit** for the kanban drag and drop

## Prerequisites

- Node.js 22+ (tested on 24)
- Docker (for the local database)

## Getting started

```bash
# 1. Start PostgreSQL (host port 5433 — 5432 is often taken)
docker compose up -d

# 2. Create environment variables
cp .env.example .env
# then set AUTH_SECRET:  openssl rand -base64 32

# 3. Install dependencies (generates the Prisma client automatically)
npm install

# 4. Apply migrations and seed a demo project
npm run db:migrate   # first run: applies the init migration
npm run db:seed

# 5. Run the app
npm run dev
```

Open http://localhost:3000. Sign in with the demo account:

```
email:    demo@example.com
password: demo1234
```

The seed creates one sample project with 7 milestones (dates relative to the
day you seeded), 17 tasks in M1 across all statuses (including a blocked and
an overdue one), two supervisor meetings (one with a task already converted),
and three open questions (open, parked, and dropped).

## Useful commands

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start the dev server                          |
| `npm run typecheck`| `tsc --noEmit`                                |
| `npm run lint`     | ESLint flat config                            |
| `npm test`         | Vitest. Pure unit tests always run; the DB-backed authorization tests run when `DATABASE_URL` is set (local docker compose or CI) |
| `npm run build`    | Production build                              |
| `npm run db:up` / `db:down` | Start / stop the Postgres container   |
| `npm run db:migrate` | Create and apply a migration (`prisma migrate dev`) |
| `npm run db:deploy` | Apply existing migrations without creating   |
| `npm run db:seed`  | Seed the demo project (re-runnable)           |
| `npm run db:reset` | Drop, migrate, and seed from scratch          |

## Project layout

```
src/
  app/                  # App Router pages
    (app)/              # protected pages (auth guard + header live here)
      projects/         # dashboard overview + project grid + create/import
      projects/[projectId]/            # milestone timeline + supervisors + share link
      projects/[projectId]/milestones/[milestoneId]  # kanban board + evidence + review + comments
      projects/[projectId]/meetings/   # supervision meeting log + action -> task
      projects/[projectId]/questions/  # open questions + adopt -> task
      supervisor/       # projects you supervise (read-only)
      supervisor/[projectId]/          # read-only review view + comments
    (auth)/login        # sign-in page
    (auth)/signup       # create-account page
    (auth)/invite/[token]  # accept a supervisor invitation (public)
    share/[token]       # public, read-only project view (share link)
    api/auth/[...nextauth]  # Auth.js route handler
  actions/
    auth.ts             # server action: sign-up
    projects.ts         # createProject, importProject, createMilestone, updateMilestoneStatus
    tasks.ts            # saveTask, deleteTask, moveTasks
    invites.ts          # createInvite, acceptInvite, removeSupervisor, revokeInvite
    comments.ts         # createComment, updateComment, deleteComment
    meetings.ts         # createMeeting, updateMeeting, deleteMeeting, addAction, convertActionToTask
    questions.ts        # createQuestion, updateQuestion, deleteQuestion, setStatus, adoptAsTask
    reviews.ts          # saveReview (upsert), deleteReview
    share.ts            # saveShareLink (create / set expiry), revokeShareLink
    evidence.ts         # createEvidence, updateEvidence, deleteEvidence (owner only)
  components/
    auth/               # client-side sign-in/sign-up forms
    projects/           # create-project + CSV import forms
    timeline/           # add-milestone form, milestone status control
    kanban/             # KanbanBoard (dnd-kit), TaskDialog
    invites/            # invite-supervisor + accept-invite forms
    comments/           # CommentSection (thread with edit/delete)
    meetings/           # meeting form + convert/add action controls
    questions/          # question form + status/adopt controls
    reviews/            # review card + record/edit panel
    evidence/           # evidence card + add/edit/delete section
    share/              # share-link panel (create, copy, expire, revoke)
    ProgressBar.tsx     # shared progress bar
    StatusBadge.tsx     # shared status badge
  lib/
    access.ts           # membership filters + per-project role lookup
    auth.ts             # NextAuth config (Credentials + JWT)
    prisma.ts           # Prisma client singleton
    validation.ts       # Zod schemas
    invites.ts          # pure invite token / hashing / expiry helpers
    share.ts            # pure share token generator / active-window check
    navigation.ts       # safe same-site callbackUrl helper
    meetings.ts         # pure agreed-action textarea parser
    dashboard.ts        # pure dashboard aggregation (progress / overdue / upcoming)
    csv-import.ts       # pure GanttProject CSV → project plan parser
    password.ts         # scrypt hashing (node:crypto, no native deps)
    data.ts             # membership-scoped read queries
    milestone-metrics.ts# pure progress / overdue / days-left helpers
    status.ts           # shared status labels and colours
  types/next-auth.d.ts  # session user.id typing
prisma/
  schema.prisma         # full data model
  seed.ts               # demo data
  migrations/           # versioned SQL migrations
tests/                  # Vitest unit tests + DB-backed authorization tests
.github/workflows/ci.yml
```

## Conventions

- **All mutations are server actions.** One pattern, used everywhere.
  NextAuth's route handler is the only exception (it must be a route).
- **Every server action re-validates with Zod.**
- **Every query is scoped through `ProjectMember`.** Reads use `memberWhere`
  (owner or supervisor); every write action uses `ownerWhere` (owner only).
  Read helpers return `null` for foreign ids, pages render 404. Supervisors
  get read-only pages under `/supervisor` and may only add comments.
- **Supervisor invites are capability links.** The raw token is shown to the
  student once and stored only as a SHA-256 hash. There is no SMTP dependency:
  the student copies the link and sends it themselves.
- Business logic lives in plain functions under `src/lib` so it is testable
  without the database.
- Dates are date-only values stored as local midnight; progress, overdue, and
  days-left are computed by one shared utility with edge-case tests.

## Importing a plan from CSV

The projects page can import a **GanttProject-style CSV** (File → Export → CSV).
One project per file; rows are matched by their outline id under the `i`
column:

- depth-1 rows → the project (its `Notes` become the project goal),
- depth-2 rows → milestones (groups, order kept, `Notes` → goal),
- depth-3 rows → tasks (`End Date` → due, TODO/MEDIUM, `Notes` kept and a
  `Depends on: …` line added from `Predecessors`; tasks are ordered after
  their dependencies).

Only the columns **i, Name/Title, Start Date, End Date, Predecessors, Notes**
are read, so the rest of the export (hours, resources, colours…) is ignored.
Importing the same title + dates twice for the same user is refused.

## Status

- **Phase 0 (done):** scaffold, Docker Compose Postgres, Prisma schema with
  first migration, Auth.js sign-up/login, protected dashboard placeholder,
  seed script, Vitest, ESLint, CI workflow, README.
- **Phase 1 (done):** project creation, milestone timeline with progress and
  one-click status changes, dnd-kit kanban (drag between To do / In progress /
  Blocked / Done + reorder), task add/edit/delete, overdue flags, owner-scoped
  DB tests, CI runs migrations before tests.
- **CSV import (done):** pure GanttProject CSV parser with row-scoped errors
  and tests, project goal column + timeline display, owner-scoped import
  server action (single transaction, duplicate guard), and an inline import
  form on the projects page.
- **Data model (done):** access moved from `Project.ownerId` to `ProjectMember`
  (OWNER / SUPERVISOR) plus `User.role`; added `Invite`, `Comment`, and
  `MeetingTask`; existing owners and meeting action lines were migrated.
- **Supervisor invites + comments (done):** the owner creates an invite link on
  the project page, the invitee accepts it at `/invite/[token]`, supervisors
  get a read-only `/supervisor` view and can comment on milestones (the owner
  sees the thread on the board). Remove-supervisor and revoke-invite controls
  are included.
- **Meetings (done):** a project meeting log (date, next date, optional
  milestone, items discussed, what went well, problems). Agreed actions are
  `MeetingTask` lines that can be added or removed individually, and a
  one-click **Convert to task** creates a `MEETING`-sourced kanban card on the
  meeting's milestone (or a chosen one) and links the two.
- **Open questions (done):** raise a question with context and the three
  weighing-up notes (if we do it / what it costs / if we don't), track
  OPEN / ADOPTED / PARKED / DROPPED, and **Adopt as task** creates a
  `QUESTION`-sourced card on a chosen milestone with the decision recorded.
- **Milestone reviews (done):** each milestone holds one review — a date, a
  verdict (On track / Partly met / Off track) and the asked-for / demonstrated
  / promised notes. Owners record, edit and delete it on the board; the verdict
  shows on the project timeline, and supervisors read the review (their
  feedback still lives in comments).
- **Dashboard (done):** the landing page is a cross-project overview — totals
  for projects, milestones and tasks done, a **Needs attention** list of
  overdue tasks (how late, and where), and a **Coming up** list of the next
  milestones with their progress, above your project cards.
- **Public share link (done):** the owner can mint a read-only link to a
  project. Anyone holding it can view the milestones, their tasks and the
  review verdicts with no account, and the owner can set an optional expiry or
  revoke it in one click. That completes the v1 read story.
- **Evidence on milestones (done):** collect the links that prove a milestone —
  demo, screenshot, test result, benchmark, commit/PR or supervisor feedback,
  each with a date, an optional URL and an optional note on what it proves.
  Owners add, edit and delete on the board; supervisors see the list read-only.
- **Still to build:** export, plus the v1.5 (report helper, all-tasks view,
  settings, notifications) and v2 (self-hosting polish) items.