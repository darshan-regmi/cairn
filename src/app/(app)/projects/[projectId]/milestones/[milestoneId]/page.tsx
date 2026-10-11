import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findMilestoneForUser, listCommentsForTarget } from "@/lib/data";
import { projectRoleFor } from "@/lib/access";
import {
  isOverdue,
  daysLeft,
  toDateInput,
} from "@/lib/milestone-metrics";
import { KanbanBoard, type KanbanCard } from "@/components/kanban/KanbanBoard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CommentSection,
  type CommentItem,
} from "@/components/comments/CommentSection";
import {
  milestoneStatusLabel,
  milestoneStatusTone,
  type MilestoneStatus,
} from "@/lib/status";

type CommentRows = Awaited<ReturnType<typeof listCommentsForTarget>>;

function toCommentItems(rows: CommentRows): CommentItem[] {
  return rows.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
    authorId: comment.authorId,
    authorName: comment.author.name,
    authorEmail: comment.author.email,
  }));
}

function daysLeftLabel(days: number): string {
  if (days === 0) return "ends today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  if (days === -1) return "1 day late";
  return `${-days} days late`;
}

export default async function MilestoneKanbanPage({
  params,
}: {
  params: Promise<{ projectId: string; milestoneId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { milestoneId } = await params;
  const milestone = await findMilestoneForUser(milestoneId, session.user.id);
  if (!milestone) notFound();

  // Supervisors read through /supervisor/[projectId], not the editing board.
  const role = await projectRoleFor(milestone.projectId, session.user.id);
  if (role === "SUPERVISOR") redirect(`/supervisor/${milestone.projectId}`);

  const comments = toCommentItems(
    await listCommentsForTarget("MILESTONE", milestone.id),
  );

  const today = new Date();
  const cards: KanbanCard[] = milestone.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due: task.due ? toDateInput(task.due) : null,
    notes: task.notes,
    commit: task.commit,
    source: task.source,
    isOverdue: isOverdue(task, today),
  }));

  // Remount the board when the underlying data changes (see react-hooks docs:
  // "adjusting state when props change" recommends a key instead of an effect).
  // New key = full board content including order within columns.
  const boardKey = JSON.stringify(
    cards.map((card) => [
      card.id,
      card.title,
      card.status,
      card.priority,
      card.due,
      card.commit,
      card.source,
      card.isOverdue,
    ]),
  );

  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-12">
      <Link
        href={`/projects/${milestone.projectId}`}
        className="text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← {milestone.project.title}
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl tracking-tight">
          {milestone.name}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge
            label={milestoneStatusLabel[milestone.status as MilestoneStatus]}
            tone={milestoneStatusTone[milestone.status as MilestoneStatus]}
          />
          <span className="text-sm text-muted">
            {toDateInput(milestone.plannedStart)} →{" "}
            {toDateInput(milestone.plannedEnd)}
          </span>
          <span
            className={`text-sm ${
              milestone.status === "DONE"
                ? "text-emerald-600 dark:text-emerald-400"
                : daysLeft(milestone, today) < 0
                  ? "font-medium text-red-700 dark:text-red-400"
                  : "text-muted"
            }`}
          >
            {daysLeftLabel(daysLeft(milestone, today))}
          </span>
        </div>
        {milestone.goal && (
          <p className="mt-2 max-w-2xl text-sm text-muted">{milestone.goal}</p>
        )}
      </header>

      <KanbanBoard
        key={boardKey}
        milestoneId={milestone.id}
        initialCards={cards}
      />

      <div className="mt-10 max-w-3xl">
        <CommentSection
          key={`milestone-${milestone.id}-${comments.map((c) => c.id).join("-")}`}
          targetType="MILESTONE"
          targetId={milestone.id}
          currentUserId={session.user.id}
          initialComments={comments}
        />
      </div>
    </main>
  );
}