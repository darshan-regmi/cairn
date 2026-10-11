import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findSupervisorProject, listCommentsForTargets } from "@/lib/data";
import { projectRoleFor } from "@/lib/access";
import {
  daysLeft,
  taskProgress,
  toDateInput,
} from "@/lib/milestone-metrics";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { CommentSection } from "@/components/comments/CommentSection";
import { groupCommentsByTarget } from "@/lib/comments";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { EvidenceCard } from "@/components/evidence/EvidenceCard";
import {
  milestoneStatusLabel,
  milestoneStatusTone,
  questionStatusLabel,
  questionStatusTone,
  type EvidenceType,
  type MilestoneStatus,
  type QuestionStatus,
  type ReviewVerdict,
} from "@/lib/status";

function daysLeftLabel(days: number): string {
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  if (days === -1) return "1 day late";
  return `${-days} days late`;
}

export default async function SupervisorProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId } = await params;

  // Owners use the editable page; only supervisors get the read-only view.
  const role = await projectRoleFor(projectId, session.user.id);
  if (role === null) notFound();
  if (role === "OWNER") redirect(`/projects/${projectId}`);

  const project = await findSupervisorProject(projectId, session.user.id);
  if (!project) notFound();

  const today = new Date();
  const milestones = project.milestones.map((milestone) => ({
    milestone,
    progress: taskProgress(milestone.tasks),
    days: daysLeft(milestone, today),
  }));

  const reviewIds = project.milestones
    .map((milestone) => milestone.review?.id)
    .filter((id): id is string => Boolean(id));
  const evidenceIds = project.milestones.flatMap((milestone) =>
    milestone.evidence.map((item) => item.id),
  );

  const [
    milestoneCommentRows,
    reviewCommentRows,
    evidenceCommentRows,
    meetingCommentRows,
    questionCommentRows,
  ] = await Promise.all([
    listCommentsForTargets(
      "MILESTONE",
      project.milestones.map((milestone) => milestone.id),
    ),
    listCommentsForTargets("REVIEW", reviewIds),
    listCommentsForTargets("EVIDENCE", evidenceIds),
    listCommentsForTargets(
      "MEETING",
      project.meetings.map((meeting) => meeting.id),
    ),
    listCommentsForTargets(
      "QUESTION",
      project.questions.map((question) => question.id),
    ),
  ]);

  const commentsByMilestone = groupCommentsByTarget(milestoneCommentRows);
  const commentsByReview = groupCommentsByTarget(reviewCommentRows);
  const commentsByEvidence = groupCommentsByTarget(evidenceCommentRows);
  const commentsByMeeting = groupCommentsByTarget(meetingCommentRows);
  const commentsByQuestion = groupCommentsByTarget(questionCommentRows);

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-4 py-12">
      <Link
        href="/supervisor"
        className="text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← Supervised projects
      </Link>

      <header className="mt-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl tracking-tight">{project.title}</h1>
          <span className="rounded-full border border-edge px-2 py-0.5 text-xs text-muted">
            Read-only
          </span>
        </div>
        {project.goal && (
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            {project.goal}
          </p>
        )}
        <p className="mt-1 text-sm text-muted">
          {toDateInput(project.startDate)} → {toDateInput(project.endDate)}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Milestones</h2>
        {milestones.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No milestones yet.</p>
        ) : (
          <ol className="mt-4 space-y-5">
            {milestones.map(({ milestone, progress, days }) => (
              <li key={milestone.id} className="rounded-lg border border-edge p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{milestone.name}</h3>
                  <span className="text-xs text-muted">
                    {daysLeftLabel(days)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={milestoneStatusLabel[milestone.status as MilestoneStatus]}
                    tone={milestoneStatusTone[milestone.status as MilestoneStatus]}
                  />
                  <span className="text-xs text-muted">
                    {toDateInput(milestone.plannedStart)} →{" "}
                    {toDateInput(milestone.plannedEnd)}
                  </span>
                </div>

                {milestone.goal && (
                  <p className="mt-2 text-sm text-muted">{milestone.goal}</p>
                )}

                {milestone.scope && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium">Scope: </span>
                    {milestone.scope}
                  </p>
                )}
                {milestone.definitionOfDone && (
                  <p className="mt-1 text-sm text-muted">
                    <span className="font-medium">Done when: </span>
                    {milestone.definitionOfDone}
                  </p>
                )}

                {milestone.deliverables.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted">
                      Deliverables
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {milestone.deliverables.map((deliverable) => (
                        <li key={deliverable.id}>
                          <span className="sr-only">
                            {deliverable.doneAt ? "Done: " : "Not done: "}
                          </span>
                          <span
                            aria-hidden="true"
                            className={
                              deliverable.doneAt
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted"
                            }
                          >
                            {deliverable.doneAt ? "✓ " : "○ "}
                          </span>
                          {deliverable.url ? (
                            <a
                              href={deliverable.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {deliverable.title}
                            </a>
                          ) : (
                            <span>{deliverable.title}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={progress.progressPercent} />
                  <span className="shrink-0 text-xs text-muted">
                    {progress.doneTasks}/{progress.totalTasks} · {progress.progressPercent}%
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-muted">Review</p>
                  {milestone.review ? (
                    <div className="mt-1">
                      <ReviewCard
                        review={{
                          date: toDateInput(milestone.review.date),
                          verdict: milestone.review.verdict as ReviewVerdict,
                          askedFor: milestone.review.askedFor,
                          demonstrated: milestone.review.demonstrated,
                          promised: milestone.review.promised,
                        }}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      No review recorded yet.
                    </p>
                  )}
                </div>

                {milestone.review && (
                  <div className="mt-3">
                    <CommentSection
                      key={`review-${milestone.review.id}-${(commentsByReview[milestone.review.id] ?? []).map((c) => c.id).join("-")}`}
                      targetType="REVIEW"
                      targetId={milestone.review.id}
                      currentUserId={session.user.id}
                      initialComments={commentsByReview[milestone.review.id] ?? []}
                    />
                  </div>
                )}

                {milestone.evidence.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted">Evidence</p>
                    <ul className="mt-1 space-y-2">
                      {milestone.evidence.map((item) => (
                        <li key={item.id}>
                          <EvidenceCard
                            evidence={{
                              id: item.id,
                              title: item.title,
                              date: toDateInput(item.date),
                              type: item.type as EvidenceType,
                              url: item.url,
                              whatItProves: item.whatItProves,
                            }}
                          />
                          <div className="mt-2">
                            <CommentSection
                              key={`evidence-${item.id}-${(commentsByEvidence[item.id] ?? []).map((c) => c.id).join("-")}`}
                              targetType="EVIDENCE"
                              targetId={item.id}
                              currentUserId={session.user.id}
                              initialComments={commentsByEvidence[item.id] ?? []}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4">
                  <CommentSection
                    key={`milestone-${milestone.id}-${(commentsByMilestone[milestone.id] ?? []).map((c) => c.id).join("-")}`}
                    targetType="MILESTONE"
                    targetId={milestone.id}
                    currentUserId={session.user.id}
                    initialComments={commentsByMilestone[milestone.id] ?? []}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Meetings</h2>
        {project.meetings.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No meetings logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {project.meetings.map((meeting) => (
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
                {meeting.itemsDiscussed && (
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {meeting.itemsDiscussed}
                  </p>
                )}
                {meeting.problems && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium">Problems: </span>
                    {meeting.problems}
                  </p>
                )}
                {meeting.actionItems.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted">
                      Agreed actions
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                      {meeting.actionItems.map((item) => (
                        <li key={item.id}>
                          {item.text}
                          {item.taskId && (
                            <span className="ml-2 text-xs text-muted">
                              → on the board
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3">
                  <CommentSection
                    key={`meeting-${meeting.id}-${(commentsByMeeting[meeting.id] ?? []).map((c) => c.id).join("-")}`}
                    targetType="MEETING"
                    targetId={meeting.id}
                    currentUserId={session.user.id}
                    initialComments={commentsByMeeting[meeting.id] ?? []}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 mb-4">
        <h2 className="text-lg font-medium">Open questions</h2>
        {project.questions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No questions raised yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {project.questions.map((question) => (
              <li
                key={question.id}
                className="rounded-lg border border-edge p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge
                    label={questionStatusLabel[question.status as QuestionStatus]}
                    tone={questionStatusTone[question.status as QuestionStatus]}
                  />
                  <span className="text-sm">{question.title}</span>
                </div>
                <div className="mt-3">
                  <CommentSection
                    key={`question-${question.id}-${(commentsByQuestion[question.id] ?? []).map((c) => c.id).join("-")}`}
                    targetType="QUESTION"
                    targetId={question.id}
                    currentUserId={session.user.id}
                    initialComments={commentsByQuestion[question.id] ?? []}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}