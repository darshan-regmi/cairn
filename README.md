# Cairn

A planner for running a project from start to finish: milestone timelines, a
kanban task board, meeting logs, open questions, milestone reviews, a read-only
share link, and evidence collection for the write-up.

The app connects the pieces: a task agreed in a meeting can be turned into a
kanban card in one click, an open question can be adopted as a task, and the
planning history becomes material you can write up later.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript strict, Turbopack)
- **Tailwind CSS v4** with a small set of design tokens and dark mode support
- **Prisma 7** with PostgreSQL (driver adapter `@prisma/adapter-pg`)
- **Firebase Authentication** — email/password sign-in that requires a verified
  address; the server swaps the ID token for an httpOnly session cookie
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
# then fill in the Firebase web keys and point FIREBASE_SERVICE_ACCOUNT at a
# service-account JSON file (see .env.example). For a Firebase-free install set
# DEPLOYMENT_MODE="selfhost" with SESSION_SECRET and APP_URL instead — see
# "Deployment modes" below.

# 3. Install dependencies (generates the Prisma client automatically)
npm install

# 4. Apply migrations and seed a login account (provisioned in Firebase too)
npm run db:migrate   # first run: applies the init migration
npm run db:seed

# 5. Run the app
npm run dev
```

Open [http://localhost:3000]. Sign in with the demo account:

```text
email:    demo@example.com
password: demo1234
```

The seed creates that account in Firebase as well (already verified) and no
projects, so a fresh database starts empty. Create your first project from the
dashboard, or import one from a CSV.

## Useful commands

| Command                     | What it does                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`               | Start the dev server                                                                                                              |
| `npm run typecheck`         | `tsc --noEmit`                                                                                                                    |
| `npm run lint`              | ESLint flat config                                                                                                                |
| `npm test`                  | Vitest. Pure unit tests always run; the DB-backed authorization tests run when `DATABASE_URL` is set (local docker compose or CI) |
| `npm run build`             | Production build                                                                                                                  |
| `npm run db:up` / `db:down` | Start / stop the Postgres container                                                                                               |
| `npm run db:migrate`        | Create and apply a migration (`prisma migrate dev`)                                                                               |
| `npm run db:deploy`         | Apply existing migrations without creating                                                                                        |
| `npm run db:seed`           | Seed a login account (no projects)                                                                                                |
| `npm run db:reset`          | Drop, migrate, and seed from scratch                                                                                              |

## Project layout

```text
src/
  app/                  # App Router pages
    page.tsx            # public landing page
    docs/               # public documentation
    (app)/              # protected pages (auth guard + header live here)
      dashboard/        # focus view for your active project: what is happening now
      no-access/        # 403 view for a project you don't belong to
      projects/         # all your projects: grid + create/import + archived (completed)
      projects/[projectId]/            # milestone timeline + supervisors + share link
      projects/[projectId]/milestones/[milestoneId]  # kanban board + evidence + review + comments
      projects/[projectId]/meetings/   # supervision meeting log + action -> task
      projects/[projectId]/questions/  # open questions + adopt -> task
      supervisor/       # projects you supervise (read-only)
      supervisor/[projectId]/          # read-only review view + comments
    (auth)/login        # sign-in page (forgot-password link lives here)
    (auth)/signup       # create-account page (student / supervisor choice)
    (auth)/setup        # first-run account, self-host mode only
    (auth)/reset        # request a password reset email
    (auth)/reset/[token]   # choose a new password (self-host)
    (auth)/verify/[token]  # confirm an email address (self-host)
    (auth)/invite/[token]  # accept a supervisor invitation (public)
    share/[token]       # public, read-only project view (share link)
    error.tsx           # 500 boundary with a request id
    global-error.tsx    # root-level 500 boundary
    not-found.tsx       # 404 page with a way back
    api/auth/session    # swaps a Firebase ID token for the session cookie
  actions/
    auth.ts             # registerAccount, signInWithPassword, resetPassword,
                        #   requestPasswordReset, verifyEmail, createFirstAdmin
    projects.ts         # createProject, importProject, milestone CRUD + move/details, project edit/complete/reopen/delete
    deliverables.ts     # add/toggle/update/delete milestone deliverables
    dashboard.ts        # markCommentsRead (supervisor-comment watermark)
    tasks.ts            # saveTask, deleteTask, moveTasks
    invites.ts          # createInvite, acceptInvite, removeSupervisor, revokeInvite
    comments.ts         # createComment, updateComment, deleteComment
    meetings.ts         # createMeeting, updateMeeting, deleteMeeting, addAction, convertActionToTask
    questions.ts        # createQuestion, updateQuestion, deleteQuestion, setStatus, adoptAsTask
    reviews.ts          # saveReview (upsert), deleteReview
    share.ts            # saveShareLink (create / set expiry), revokeShareLink
    evidence.ts         # createEvidence, updateEvidence, deleteEvidence (owner only)
  components/
    auth/               # sign-in / sign-up / reset-email client forms
    projects/           # create/edit-project + CSV import forms + complete/reopen/delete controls
    timeline/           # add-milestone form, status control, move/edit/delete controls
    kanban/             # KanbanBoard (dnd-kit), TaskDialog
    invites/            # invite-supervisor + accept-invite forms
    comments/           # CommentSection (thread with edit/delete), reused on
                        #   milestones, tasks, meetings, questions, reviews,
                        #   evidence
    meetings/           # meeting form + convert/add action controls
    questions/          # question form + status/adopt controls
    reviews/            # review card + record/edit panel
    evidence/           # evidence card + add/edit/delete section
    deliverables/       # milestone deliverables checklist
    milestone/          # milestone scope + definition of done panel
    share/              # share-link panel (create, copy, expire, revoke)
    ProgressBar.tsx     # shared progress bar
    StatusBadge.tsx     # shared status badge
  lib/
    access.ts           # membership filters + per-project role lookup
    auth.ts             # auth() session guard + clearSession
    auth-provider.ts    # AuthProvider seam; picks the adapter from DEPLOYMENT_MODE
    auth-firebase.ts    # cloud adapter: Firebase session cookie + account rows
    auth-selfhost.ts    # self-host adapter: password rows live in Postgres
    config.ts           # environment feature flags (ALLOW_SIGNUP)
    deployment.ts       # DEPLOYMENT_MODE parsing + startup config check
    password.ts         # scrypt password hashing
    session.ts          # session cookie name + attributes
    tokens.ts           # signed session, email-verification and reset tokens
    rate-limit.ts       # in-memory failure limiter for sign-in
    smtp.ts             # minimal SMTP client for verification / reset mail
    prisma.ts           # Prisma client singleton
    validation.ts       # Zod schemas
    invites.ts          # pure invite token / hashing / expiry helpers
    share.ts            # pure share token generator / active-window check
    navigation.ts       # safe same-site callbackUrl helper
    meetings.ts         # pure agreed-action textarea parser
    dashboard.ts        # pure dashboard aggregation (progress / overdue / due-soon /
                        #   meeting prep / open questions / unread comments)
    supervisor.ts       # pure supervised-project summary (on-track / behind + next meeting)
    csv-import.ts       # pure GanttProject CSV → project plan parser
    firebase/client.ts  # browser SDK + auth error copy
    firebase/admin.ts   # Admin SDK: session cookies + account lookups
    data.ts             # membership-scoped read queries
    comments.ts         # comment row → CommentItem mapping / per-target grouping
    milestone-metrics.ts# pure progress / overdue / days-left helpers
    status.ts           # shared status labels and colours
prisma/
  schema.prisma         # full data model
  seed.ts               # demo data
  migrations/           # versioned SQL migrations
tests/                  # Vitest unit tests + DB-backed authorization tests
.github/workflows/ci.yml
```

## Deployment modes

Cairn has two ways to store accounts, chosen by a single environment variable,
`DEPLOYMENT_MODE`:

| Mode | Accounts live in | Firebase |
| --- | --- | --- |
| `cloud` (default) | Firebase Auth | required |
| `selfhost` | this PostgreSQL database | never loaded or called |

In `selfhost` mode there is no Firebase dependency at all: accounts are email +
password rows in Postgres (hashed with scrypt), sessions are signed httpOnly
cookies, and verification and reset links are signed tokens. The first visitor
to a fresh install creates the first account at `/setup`.

To run the published image with docker compose, see
[`SELF_HOSTING.md`](./SELF_HOSTING.md); `.env.selfhost.example` documents every
variable. To run self-host mode from this checkout instead:

```bash
DEPLOYMENT_MODE=selfhost
DATABASE_URL="postgresql://cairn:cairn@localhost:5433/cairn"
SESSION_SECRET="at-least-32-characters-generated-with-openssl"
APP_URL="http://localhost:3000"
```

`SESSION_SECRET` is required and must be at least 32 characters; the app refuses
to start without it. Set `SMTP_*` (see `.env.selfhost.example`) to send
verification and reset mail; without it those links are printed to the logs
instead.

## Conventions

- **All mutations are server actions.** One pattern, used everywhere.
  The Firebase session route handler is the only exception (it must be a route).
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
- **Focus dashboard (done):** `/dashboard` is a focus view for one active
  project — at-a-glance totals, the phase that is in progress with the tasks
  being worked on right now, and what is due this week, with a switcher when
  more than one project is in progress. `/projects` holds every project you
  own, split into **in progress** and **archived**: complete a project to move
  it to the archive (its share link pauses), reopen it any time, or edit and
  delete projects and milestones. New supervisor comments surface on the
  dashboard and clear in one click.
- **Public share link (done):** the owner can mint a read-only link to a
  project. Anyone holding it can view the milestones, their tasks and the
  review verdicts with no account, and the owner can set an optional expiry or
  revoke it in one click. That completes the v1 read story.
- **Evidence on milestones (done):** collect the links that prove a milestone —
  demo, screenshot, test result, benchmark, commit/PR or supervisor feedback,
  each with a date, an optional URL and an optional note on what it proves.
  Owners add, edit and delete on the board; supervisors see the list read-only.
- **Comments on every target (done):** any project member can discuss a
  milestone, task, meeting, open question, review or piece of evidence. Authors
  edit or delete their own comments; owners see the threads on the board, the
  meetings page and the questions page, and supervisors see them and reply from
  `/supervisor/[projectId]`.
- **Milestone scope, definition of done and deliverables (done):** a milestone
  can carry a scope, a definition of done and a checklist of deliverables (each
  with an optional link) that owners tick off on the board; supervisors and
  share links see them read-only.
- **Timeline reorder and reschedule (done):** milestones can be moved up or down
  and given new dates straight from the project timeline, using a two-pass
  transaction that keeps the per-project order unique.
- **Every view reads the whole plan (done):** share links and supervisor views
  include meetings, supervised projects are summarised on the supervisor home
  with an on-track / behind badge and the next meeting date, and the question
  board groups questions by status.
- **System pages (done):** a 404 that leads back to the dashboard, a 500 page
  that shows the request id, and a distinct no-access page when you open a
  project you do not belong to.
- **Self-service accounts (done):** sign-up asks whether you are a student or a
  supervisor and can be closed with `ALLOW_SIGNUP=false`. Accounts live in
  Firebase: a verification email must be opened before the first sign-in, and the
  login page links to a password reset that Firebase sends for you.
- **Landing and docs (done):** a public landing page at `/` and a `/docs` guide
  covering the whole workflow and self-hosting configuration.
- **Self-hosted deployment (done):** a `DEPLOYMENT_MODE` switch behind an
  `AuthProvider` seam. In `selfhost` mode accounts are Postgres rows with scrypt
  password hashes, sessions are signed httpOnly cookies, verification and reset
  links are signed tokens, sign-in is rate limited, and the first run creates the
  first account at `/setup`. The Firebase SDK is never imported or called. Ships
  as a multi-stage Docker image that migrates the database on startup.
- **Still to build:** report helper, all-tasks view, settings, notifications, and
  the v2 self-hosting polish items.
