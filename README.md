# Cairn

**A self-hostable planner for running a project end to end — milestones, kanban, meetings, open questions, reviews and evidence in one place.**

Most student and side projects die in a folder full of disconnected notes: a kanban board here, meeting notes in a document, questions in a chat thread, and the "proof it works" screenshots scattered everywhere. Cairn connects those pieces so that the plan, the work, and the evidence for it live in the same system.

[![CI](https://github.com/darshan-regmi/cairn/actions/workflows/ci.yml/badge.svg)](https://github.com/darshan-regmi/cairn/actions/workflows/ci.yml)
[![Release image](https://github.com/darshan-regmi/cairn/actions/workflows/release.yml/badge.svg)](https://github.com/darshan-regmi/cairn/actions/workflows/release.yml)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--arch-2496ED?logo=docker&logoColor=white)

> **Status:** v1 feature-complete and in active use; self-hosted via Docker. See [Roadmap](#roadmap) for what is next.

---

## Screenshots

<!-- Replace these placeholders with real captures. See docs/screenshots/README.md for the exact list and sizes. -->

| Focus dashboard | Kanban board | Milestone timeline |
| --- | --- | --- |
| _`docs/screenshots/dashboard.png`_ | _`docs/screenshots/kanban.png`_ | _`docs/screenshots/timeline.png`_ |

| Supervisor review | Public share link | Self-host setup |
| --- | --- | --- |
| _`docs/screenshots/supervisor.png`_ | _`docs/screenshots/share.png`_ | _`docs/screenshots/setup.png`_ |

## Live demo

<!-- Publish a demo instance and put the URL here. Until then, delete this section rather than leaving a dead link. -->

**Demo:** `https://<your-demo-host>` — sign in with `demo@example.com` / `demo1234`.

---

## The problem

A project that runs for a semester has four kinds of truth that never stay in sync:

1. **The plan** — what the milestones are and when they land.
2. **The work** — what is actually being done this week.
3. **The conversations** — what was agreed in the last supervision meeting.
4. **The evidence** — the links that prove a milestone is really finished.

Cairn makes those four things the same object graph. A task agreed in a meeting becomes a kanban card in one click. An open question becomes a task with its decision recorded. A milestone accumulates evidence, and the whole plan can be handed to a supervisor as a read-only link.

## What it does

| Surface | What it gives you |
| --- | --- |
| **Focus dashboard** | One active project at a glance: totals, the phase in progress, what is due this week, unread supervisor comments. |
| **Milestone timeline** | Ordered milestones with progress, overdue flags, reorder/reschedule, and a review verdict on each. |
| **Kanban board** | `dnd-kit` board per milestone — drag between To do / In progress / Blocked / Done, plus reordering. |
| **Meetings** | Date, next date, what went well, problems. Agreed actions convert to real tasks and stay linked. |
| **Question board** | `OPEN → ADOPTED / PARKED / DROPPED`, with "adopt as task" recording the decision. |
| **Milestone reviews** | Verdict (on track / partly met / off track) plus asked-for, demonstrated and promised notes. |
| **Evidence** | Demo, screenshot, test result, benchmark, commit, PR or feedback — each with a date and a note on what it proves. |
| **Comments** | Threads on milestones, tasks, meetings, questions, reviews and evidence. Authors edit/delete their own. |
| **Share links** | Public read-only project view, optional expiry, revocable in one click. |
| **Supervisor mode** | Invite a supervisor by capability link; they get a read-only view plus comment access. |
| **CSV import** | Import a GanttProject CSV: depth-1 rows become the project, depth-2 milestones, depth-3 tasks, with `Predecessors` turned into dependency ordering. |

---

## Architecture

```mermaid
flowchart TB
    subgraph Browser
        RSC[React 19 Server Components]
        DND[dnd-kit kanban]
    end

    subgraph "Next.js 16 server"
        PAGES[App Router pages<br/>route groups: (app) / (auth) / share]
        ACTIONS[Server Actions<br/>src/actions/*]
        ZOD[Zod validation<br/>every action, every input]
        ACCESS[Access layer<br/>src/lib/access.ts<br/>memberWhere / ownerWhere]
        AUTH[AuthProvider seam<br/>src/lib/auth-provider.ts]
        PURE[Pure domain logic<br/>src/lib/*.ts]
    end

    subgraph Data
        PRISMA[Prisma 7 + @prisma/adapter-pg]
        PG[(PostgreSQL 16)]
    end

    subgraph "Auth adapters"
        FB[Firebase Admin SDK<br/>DEPLOYMENT_MODE=cloud]
        SH[Postgres accounts + scrypt<br/>DEPLOYMENT_MODE=selfhost]
    end

    RSC --> PAGES
    DND --> ACTIONS
    PAGES --> ACTIONS
    PAGES --> ACCESS
    ACTIONS --> ZOD --> ACCESS --> PRISMA --> PG
    ACTIONS --> PURE
    PAGES --> AUTH
    AUTH --> FB
    AUTH --> SH
    SH --> PG
    FB -.->|ID token → httpOnly session cookie| AUTH
```

**Request path for a mutation:** client component → server action → Zod parse → membership/role guard → Prisma transaction → `revalidatePath`. There is no REST or GraphQL layer: every mutation is a server action, which keeps authorization in one place instead of spread across endpoints.

### Engineering decisions worth reviewing

| Decision | Why | Where |
| --- | --- | --- |
| **Auth behind a provider seam** | One `DEPLOYMENT_MODE` env var swaps Firebase for self-hosted accounts. In `selfhost` mode the Firebase SDK is never imported, so the app runs with zero third-party auth dependency. | `src/lib/auth-provider.ts`, `auth-firebase.ts`, `auth-selfhost.ts` |
| **Authorization is a query scope, not a check** | Every read goes through `memberWhere` (owner *or* supervisor), every write through `ownerWhere` (owner only). Foreign IDs return `null` and the page 404s — so an access bug cannot leak another user's project. | `src/lib/access.ts`, `src/lib/data.ts` |
| **Capability links for invites and sharing** | Raw tokens are shown once and stored as SHA-256 hashes, with expiry. No invite email dependency; the owner sends the link. | `src/lib/invites.ts`, `src/lib/share.ts` |
| **Business logic is pure and DB-free** | Progress, overdue, days-left, dashboard aggregation, CSV parsing and supervisor summaries are plain functions — which is why 207 tests run without a database. | `src/lib/dashboard.ts`, `milestone-metrics.ts`, `csv-import.ts`, `supervisor.ts` |
| **Ordering without gaps** | Milestone reorder uses a two-pass transaction to keep per-project `order` unique while moving rows. | `src/actions/projects.ts` |
| **Date-only values, one clock** | Due dates are stored as local midnight and all derived states come from one shared helper with edge-case tests. | `src/lib/milestone-metrics.ts` |
| **Self-host image that migrates itself** | Multi-stage build, non-root user, healthcheck, `prisma migrate deploy` on boot in selfhost mode only. | `Dockerfile`, `docker-entrypoint.sh` |

### Security model

- Sessions are signed httpOnly cookies; the Firebase ID token is exchanged server-side at `/api/auth/session`.
- Self-host passwords are hashed with `scrypt`; sign-in is rate limited (`src/lib/rate-limit.ts`).
- Email verification and password reset use signed, expiring tokens.
- `SESSION_SECRET` is validated at startup — the app refuses to boot without ≥32 characters.
- Every server action re-validates its input with Zod; nothing trusts the client payload.
- No secret ever enters the build context: `.env*` and `.secrets/` are ignored, and the image reads configuration at runtime.

---

## Getting started

**Prerequisites:** Node.js 22+ (tested on 24) and Docker.

```bash
# 1. Postgres on host port 5433 (5432 is usually taken)
docker compose up -d

# 2. Environment
cp .env.example .env
# cloud mode: fill in the Firebase web keys and FIREBASE_SERVICE_ACCOUNT
# selfhost mode: set DEPLOYMENT_MODE=selfhost, SESSION_SECRET and APP_URL
#                (see .env.selfhost.example)

# 3. Dependencies (postinstall generates the Prisma client)
npm install

# 4. Schema + demo account
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in:

```text
email:    demo@example.com
password: demo1234
```

The seed creates the account in Firebase too (already verified) and no projects, so a fresh database starts empty. Create a project from the dashboard, or import one from a CSV.

## Testing

```bash
npm test          # Vitest
npm run typecheck # tsc --noEmit
npm run lint      # ESLint flat config
```

**207 tests across 22 files.** Pure unit tests always run; the DB-backed authorization tests (`tests/db-access.test.ts`, 14 cases) run when `DATABASE_URL` is set. CI starts a `postgres:16` service, applies migrations from clean, then runs typecheck → lint → test → build on every push and pull request.

## Deployment

| Mode | Accounts live in | Firebase |
| --- | --- | --- |
| `cloud` (default) | Firebase Auth | required |
| `selfhost` | this PostgreSQL database | never loaded or called |

In `selfhost` mode accounts are Postgres rows (scrypt hashes), sessions are signed httpOnly cookies, and verification/reset are signed tokens. The first visitor to a fresh install creates the first account at `/setup`.

The release workflow publishes a multi-arch (`amd64`/`arm64`) image to GHCR on every `v*` tag:

```bash
docker pull ghcr.io/darshan-regmi/cairn:latest
```

Full instructions: [`SELF_HOSTING.md`](./SELF_HOSTING.md) · every variable is documented in [`.env.selfhost.example`](./.env.selfhost.example).

---

## Project structure

```text
src/
  app/
    (app)/          # authenticated: dashboard, projects, milestones, meetings,
                    #   questions, supervisor views
    (auth)/         # login, signup, setup, reset, verify, invite accept
    share/[token]/  # public read-only project view
    api/auth/session# Firebase ID token -> session cookie
  actions/          # every mutation, one server action per operation
  components/       # feature-grouped client components (kanban, timeline, ...)
  lib/              # access control, auth adapters, pure domain logic
prisma/
  schema.prisma     # 13 models / 11 enums
  migrations/       # versioned SQL
tests/              # Vitest unit + DB-backed authorization tests
scripts/            # VPS setup and update helpers
```

## Roadmap

- [ ] Report helper (export a project write-up from its evidence and reviews)
- [ ] All-tasks view across projects
- [ ] Notifications (due-soon, new comments)
- [ ] Settings page and per-project preferences
- [ ] v2 self-hosting polish (backup/restore, upgrade notes)

## License

MIT — see [LICENSE](./LICENSE).

---

Built by [Darshan Regmi](https://darshanregmi.com.np).
