# Screenshots

The README expects six captures in this folder. Take them at a consistent
viewport so the grid looks deliberate.

## Capture settings

- **Browser:** Chrome, window 1440 × 900, device pixel ratio 2.
- **Theme:** dark mode for the dashboard/kanban/timeline trio; light mode for
  the setup screen.
- **Data:** run `npm run db:seed`, create one project named "Final Year
  Project", add 4 milestones and ~12 tasks, and record one review so the
  progress bars and verdicts have something to show.
- **Crop:** no browser chrome, no OS dock. Status bars and empty states are
  fine — do not hide the UI.
- **Format:** PNG, under ~400 KB each (run `pngquant` if needed).

## Required files

| File | Screen | Route |
| --- | --- | --- |
| `dashboard.png` | Focus dashboard with totals and due-this-week | `/dashboard` |
| `kanban.png` | Board with cards in three columns, one card mid-drag | `/projects/<id>/milestones/<id>` |
| `timeline.png` | Milestone timeline showing progress and a review verdict | `/projects/<id>` |
| `supervisor.png` | Read-only supervisor view with a comment thread | `/supervisor/<id>` |
| `share.png` | Public share link with no account | `/share/<token>` |
| `setup.png` | First-run account creation | `/setup` |

## Optional

- `demo.gif` — 8–12 seconds: create a project, add a milestone, drag a task to
  Done. Keep it under 5 MB. Add it directly under the intro if you record one.
