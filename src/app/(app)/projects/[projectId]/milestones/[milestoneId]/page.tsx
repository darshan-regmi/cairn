import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  findMilestoneForUser,
  listCommentsForTarget,
  listCommentsForTargets,
} from "@/lib/data";
import { projectRoleFor } from "@/lib/access";
import {
  isOverdue,
  daysLeft,
  toDateInput,
} from "@/lib/milestone-metrics";
import { KanbanBoard, type KanbanCard } from "@/components/kanban/KanbanBoard";
import { StatusBadge } from "@/components/StatusBadge";
import { CommentSection } from "@/components/comments/CommentSection";
import { groupCommentsByTarget, toCommentItems } from "@/lib/comments";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewFormPanel } from "@/components/reviews/ReviewForm";
import { EvidenceSection } from "@/components/evidence/EvidenceSection";
import { deleteReviewAction } from "@/actions/reviews";
import {
  milestoneStatusLabel,
  milestoneStatusTone,
  type EvidenceType,
  type MilestoneStatus,
  type ReviewVerdict,
} from "@/lib/status";

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

  const reviewComments = toCommentItems(
    milestone.review
      ? await listCommentsForTarget("REVIEW", milestone.review.id)
      : [],
  );

  const evidenceComments = groupCommentsByTarget(
    await listCommentsForTargets(
      "EVIDENCE",
      milestone.evidence.map((item) => item.id),
    ),
  );

  const taskComments = groupCommentsByTarget(
    await listCommentsForTargets(
      "TASK",
      milestone.tasks.map((task) => task.id),
    ),
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

  const evidence = milestone.evidence.map((item) => ({
    id: item.id,
    title: item.title,
    date: toDateInput(item.date),
    type: item.type as EvidenceType,
    url: item.url,
    whatItProves: item.whatItProves,
  }));

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
        comments={taskComments}
        currentUserId={session.user.id}
      />

      <EvidenceSection
        milestoneId={milestone.id}
        items={evidence}
        comments={evidenceComments}
        currentUserId={session.user.id}
      />

      <section className="mt-10 max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Review</h2>
          {milestone.review && (
            <form action={deleteReviewAction}>
              <input type="hidden" name="milestoneId" value={milestone.id} />
              <button
                type="submit"
                className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
              >
                Delete review
              </button>
            </form>
          )}
        </div>

        <div className="mt-3 space-y-3">
          {milestone.review ? (
            <ReviewCard
              review={{
                date: toDateInput(milestone.review.date),
                verdict: milestone.review.verdict as ReviewVerdict,
                askedFor: milestone.review.askedFor,
                demonstrated: milestone.review.demonstrated,
                promised: milestone.review.promised,
              }}
            />
          ) : (
            <p className="text-sm text-muted">
              Note how this milestone was reviewed, and what was agreed for next
              time.
            </p>
          )}
          <ReviewFormPanel
            milestoneId={milestone.id}
            review={
              milestone.review
                ? {
                    date: toDateInput(milestone.review.date),
                    verdict: milestone.review.verdict as ReviewVerdict,
                    askedFor: milestone.review.askedFor ?? "",
                    demonstrated: milestone.review.demonstrated ?? "",
                    promised: milestone.review.promised ?? "",
                  }
                : undefined
            }
          />
        </div>

        {milestone.review && (
          <div className="mt-4">
            <CommentSection
              key={`review-${milestone.review.id}-${reviewComments
                .map((c) => c.id)
                .join("-")}`}
              targetType="REVIEW"
              targetId={milestone.review.id}
              currentUserId={session.user.id}
              initialComments={reviewComments}
            />
          </div>
        )}
      </section>

      <div className="mt-10 max-w-3xl">
        <CommentSection
          key={`milestone-${milestone.id}-${comments.map((c) => c.id).join("-")}`}
          targetType="MILESTONE"
          targetId={milestone.id}
          currentUserId={session.user.id}
          initialComments={comments}
        />
      </div>

      {milestone.meetings.length > 0 && (
        <section aria-labelledby="meetings-heading" className="mt-10 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="meetings-heading" className="text-lg font-medium">
              Meetings
            </h2>
            <Link
              href={`/projects/${milestone.projectId}/meetings`}
              className="rounded text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Open meeting log
            </Link>
          </div>
          <ul className="mt-3 space-y-3">
            {milestone.meetings.map((meeting) => (
              <li key={meeting.id} className="rounded-lg border border-edge p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {toDateInput(meeting.date)}
                  </span>
                  {meeting.nextMeetingDate && (
                    <span className="text-xs text-muted">
                      Next: {toDateInput(meeting.nextMeetingDate)}
                    </span>
                  )}
                </div>
                {meeting.problems && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium">Problems: </span>
                    {meeting.problems}
                  </p>
                )}
                {meeting.actionItems.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">
                    {meeting.actionItems.map((item) => (
                      <li key={item.id}>
                        {item.text}
                        {item.taskId && (
                          <span className="ml-2 text-xs">→ on the board</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}