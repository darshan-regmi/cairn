# FYP Planner

A planner for running your whole final year project: milestone timelines, a
kanban task board, supervisor meeting logs, open questions, milestone reviews,
and evidence collection for the final report and viva.

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
      projects/         # project list + create form
      projects/[projectId]/            # milestone timeline
      projects/[projectId]/milestones/[milestoneId]  # kanban board
    (auth)/login        # sign-in page
    (auth)/signup       # create-account page
    api/auth/[...nextauth]  # Auth.js route handler
  actions/
    auth.ts             # server action: sign-up
    projects.ts         # createProject, importProject, createMilestone, updateMilestoneStatus
    tasks.ts            # saveTask, deleteTask, moveTasks
  components/
    auth/               # client-side sign-in/sign-up forms
    projects/           # create-project + CSV import forms
    timeline/           # add-milestone form, milestone status control
    kanban/             # KanbanBoard (dnd-kit), TaskDialog
    ProgressBar.tsx     # shared progress bar
    StatusBadge.tsx     # shared status badge
  lib/
    auth.ts             # NextAuth config (Credentials + JWT)
    prisma.ts           # Prisma client singleton
    validation.ts       # Zod schemas
    csv-import.ts       # pure GanttProject CSV → project plan parser
    password.ts         # scrypt hashing (node:crypto, no native deps)
    data.ts             # owner-scoped read queries
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
- **Every query is scoped to the owner** (`session.user.id`); read helpers
  return `null` for foreign ids, pages render 404. The read-only supervisor
  share link (Phase 4) is the only account-less access and is limited to one
  project.
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
- **Phases 2–4:** meetings, questions, reviews + dashboard, sharing and export.