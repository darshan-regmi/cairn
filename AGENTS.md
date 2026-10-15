<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cairn — Agent Guide

## 1. Overview

Cairn is a project planner: milestone timeline, kanban board, meeting log, open
questions, milestone reviews, read-only share links and evidence collection.
Next.js 16 (App Router, React 19, Turbopack), TypeScript strict, Tailwind v4,
Prisma 7 + PostgreSQL, Firebase Auth, Zod, dnd-kit. Single app at the repo root,
**npm**; see `README.md` for setup and the CSV import format.

## 2. Commands

```bash
npm install              # also runs prisma generate (postinstall)
npm run dev              # dev server on http://localhost:3000
npm run build            # production build
npm run lint             # eslint (flat config)
npm run typecheck        # tsc --noEmit
npm test                 # vitest run
npm test -- tests/dashboard.test.ts   # single test file (or: npx vitest run <file>)
npm run db:up            # docker compose up -d (Postgres on host port 5433)
npm run db:migrate       # prisma migrate dev — create + apply a migration
npm run db:deploy        # prisma migrate deploy — apply existing, no new
npm run db:seed          # seed demo account demo@example.com / demo1234
npm run db:reset         # drop, migrate, seed from scratch
```

No formatter is configured — match surrounding style. TODO: confirm with team.

## 3. Project layout

- `src/app/` — routes. Public pages at top level; protected pages under the
  `(app)` group (auth guard + header come from its layout); auth under `(auth)`.
- `src/actions/` — server actions, one file per domain; thin (authorize →
  validate → Prisma write → `revalidatePath`).
- `src/lib/` — pure business logic + membership-scoped read queries (`data.ts`)
  and view-model mapping (`comments.ts`, `status.ts`, `milestone-metrics.ts`).
- `src/components/` — components grouped by feature, matching the route.
- `tests/` — Vitest, one file per unit. `prisma/` — schema, migrations, seed.

## 4. Branching and Git workflow

- **Only `main` exists today.** TODO: confirm with team whether a
  `develop`/`staging` integration branch is planned.
- Never commit directly to `main`; always branch and open a PR.
  Branch names: `feat/`, `fix/`, `chore/`, `hotfix/` + short-description
  (e.g. `fix/share-link-expiry`).
- Commits: prefer Conventional Commits (`type(scope): message`), small and
  atomic. Existing history is mixed — not every commit follows this yet
  (e.g. `a11y:`, `chore:`, plain sentences). TODO: confirm with team to standardize.
- Never force-push or rewrite published history on shared branches.
- PRs: description, linked issue, green CI, required reviews — TODO: confirm the
  exact review count and squash-vs-merge policy with team.
- Hotfix: branch from `main` as `hotfix/…`, PR back into `main`.
  TODO: confirm backmerge target if an integration branch is introduced.

## 5. Code style

- TypeScript `strict`; import via the `@/*` → `src/*` alias.
- Named exports (server actions and helpers), no default exports.
- Every server action re-validates input with the Zod schemas in
  `src/lib/validation.ts` — client validation is never the trust boundary.
- **Copy an example**: pure logic → `src/lib/milestone-metrics.ts`; a server
  action → `src/actions/tasks.ts`; a feature component → `src/components/kanban/`.
- Reuse shared pieces (`ProgressBar`, `StatusBadge`, `CommentSection`); no
  near-duplicates. Tailwind design tokens / dark-mode classes only — no inline hex.
- Scope every query through `ProjectMember`: reads use `memberWhere` (owner or
  supervisor), writes use `ownerWhere` (owner only). Read helpers return `null`
  for a foreign id and the page renders 404.

## 6. Testing

- Pure-logic tests always run. **DB-backed tests run only when `DATABASE_URL`
  is set** (local `docker compose` or CI).
- Every new pure function and every authorization path needs a test; **bug fixes
  require a regression test** that fails before the fix.
- Run the relevant tests (full `npm test` when touching shared helpers) before declaring done. No coverage threshold is enforced — TODO: confirm with team.

## 7. Definition of done

All of `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.
No stray debug code or commented-out blocks. Docs updated (README `/docs`, and a
migration included for any schema change). Never report a task complete if any
check fails.

## 8. Security

- No secrets in code, commits or logs. Use `.env` locally; `.env*` and
  `.secrets/` are gitignored — keep it that way. Web (public) Firebase keys are
  the only values safe to expose.
- Validate all input at the boundary (Zod) — server actions included.
- Tokens are never stored in the clear: invites store a SHA-256 hash, session
  cookies are httpOnly.
- No new dependencies without approval. Run `npm audit` when touching deps.

## 9. Database and migrations

- Create migrations with `npm run db:migrate`; never edit an applied migration.
- Prefer backward-compatible changes (add column nullable or with a default,
  backfill, then tighten). CI applies migrations from a clean DB before tests.
- Destructive changes (dropping columns/tables, data loss) require approval.
- The Prisma client is generated into `src/generated` (gitignored) — run
  `npx prisma generate` after a schema change, never hand-edit generated output.

## 10. Environments, deploy and rollback

- Environments today: **local** (docker compose) and **CI** (ephemeral Postgres).
- No staging/prod, no deploy workflow, and no documented rollback exist.
  TODO: confirm all three with team.
- Feature flags: only `ALLOW_SIGNUP` (env, in `src/lib/config.ts`) exists today.
- **Never touch**: production database or config, real credentials, or any deploy
  trigger. The agent must not deploy.

## 11. Observability

- Errors surface through the App Router boundaries (`error.tsx` request id,
  `global-error.tsx`, `not-found.tsx`) — keep that pattern for new failures.
- Server actions return typed results; do not swallow errors silently.
  No logging/monitoring/alerting is configured — TODO: confirm with team.

## 12. Boundaries

- **Always:** run lint/typecheck/test/build before done; scope queries through
  `ProjectMember`; validate with Zod; add a regression test with a bug fix.
- **Ask first:** new dependencies; schema or destructive migrations; changing
  auth/session behaviour; renaming routes; anything touching CI or deploy config.
- **Never:** commit `.env`/`.secrets/`; edit an applied migration; force-push or
  rewrite shared history; commit directly to `main`; deploy or touch prod data.

## 13. Gotchas

- Postgres runs on host port **5433** (5432 is often taken), but CI uses 5432.
- The Prisma client lives in `src/generated` and is gitignored — regenerate it.
- Dates are date-only, stored as local midnight; do all progress/overdue/days-left
  math via `src/lib/milestone-metrics.ts`, never inline.
- The `/docs` route (`src/app/docs/page.tsx`) is user-facing documentation — keep
  it in sync with features.
- `db:migrate` needs the DB up (`db:up`); the Next.js block at the top of this
  file is re-added by `next dev`.

## 14. Memory

- Save durable decisions with the memory tools (the why, not the what). Never store secrets, tokens, or personal data.
- When a long task is nearly done, remind me to run /handoff.
