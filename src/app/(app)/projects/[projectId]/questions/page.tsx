import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findQuestionsForUser, listCommentsForTargets } from "@/lib/data";
import { projectRoleFor } from "@/lib/access";
import { deleteQuestionAction } from "@/actions/questions";
import { toDateInput } from "@/lib/milestone-metrics";
import { StatusBadge } from "@/components/StatusBadge";
import {
  QUESTION_STATUSES,
  questionStatusLabel,
  questionStatusTone,
  taskStatusLabel,
  type QuestionStatus,
  type TaskStatus,
} from "@/lib/status";
import {
  AddQuestionPanel,
  EditQuestionPanel,
  type QuestionFormValues,
} from "@/components/questions/QuestionForm";
import {
  AdoptQuestionForm,
  QuestionStatusControl,
} from "@/components/questions/QuestionActions";
import { CommentSection } from "@/components/comments/CommentSection";
import { groupCommentsByTarget } from "@/lib/comments";

type QuestionsProject = NonNullable<
  Awaited<ReturnType<typeof findQuestionsForUser>>
>;
type QuestionRow = QuestionsProject["questions"][number];

function toFormValues(question: QuestionRow): QuestionFormValues {
  return {
    id: question.id,
    title: question.title,
    milestoneId: question.milestoneId ?? "",
    context: question.context ?? "",
    ifWeDoIt: question.ifWeDoIt ?? "",
    whatItCosts: question.whatItCosts ?? "",
    ifWeDont: question.ifWeDont ?? "",
  };
}

export default async function QuestionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId } = await params;
  const project = await findQuestionsForUser(projectId, session.user.id);
  if (!project) notFound();

  // Supervisors read questions through the read-only supervisor view.
  const role = await projectRoleFor(project.id, session.user.id);
  if (role === "SUPERVISOR") redirect(`/supervisor/${project.id}`);

  const milestones = project.milestones.map((milestone) => ({
    id: milestone.id,
    name: milestone.name,
  }));

  const commentsByQuestion = groupCommentsByTarget(
    await listCommentsForTargets(
      "QUESTION",
      project.questions.map((question) => question.id),
    ),
  );

  const groups = QUESTION_STATUSES.map((status) => ({
    status,
    questions: project.questions.filter((question) => question.status === status),
  }));

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link
        href={`/projects/${project.id}`}
        className="text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ← {project.title}
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight">Open questions</h1>
          <p className="mt-1 text-sm text-muted">
            Park decisions until you can call them: what it buys you, what it
            costs, and what happens if you don&rsquo;t do it.
          </p>
        </div>
        <AddQuestionPanel projectId={project.id} milestones={milestones} />
      </header>

      {project.questions.length === 0 ? (
        <section className="mt-16 rounded-lg border border-dashed border-edge p-10 text-center">
          <h2 className="text-lg font-medium">No questions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Raise a question to weigh it up properly before it becomes work.
          </p>
        </section>
      ) : (
        <div className="mt-10 space-y-10">
          {groups.map(({ status, questions }) => (
            <section key={status} aria-labelledby={`questions-${status}`}>
              <div className="flex items-center gap-2">
                <h2
                  id={`questions-${status}`}
                  className="text-lg font-medium"
                >
                  {questionStatusLabel[status]}
                </h2>
                <span className="rounded-full border border-edge px-2 py-0.5 text-xs text-muted">
                  {questions.length}
                </span>
              </div>

              {questions.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  No {questionStatusLabel[status].toLowerCase()} questions.
                </p>
              ) : (
                <ol className="mt-4 space-y-5">
                  {questions.map((question) => (
                    <li
                      key={question.id}
                      className="rounded-lg border border-edge p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{question.title}</h3>
                          <StatusBadge
                            label={
                              questionStatusLabel[
                                question.status as QuestionStatus
                              ]
                            }
                            tone={
                              questionStatusTone[
                                question.status as QuestionStatus
                              ]
                            }
                          />
                          {question.milestone && (
                            <span className="rounded-full border border-edge px-2 py-0.5 text-xs text-muted">
                              {question.milestone.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <EditQuestionPanel
                            projectId={project.id}
                            milestones={milestones}
                            question={toFormValues(question)}
                          />
                          <form action={deleteQuestionAction}>
                            <input
                              type="hidden"
                              name="questionId"
                              value={question.id}
                            />
                            <button
                              type="submit"
                              className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>

                      <p className="mt-1 text-xs text-muted">
                        Raised {toDateInput(question.raisedAt)}
                        {question.decidedAt
                          ? ` · decided ${toDateInput(question.decidedAt)}`
                          : ""}
                      </p>

                      {question.context && (
                        <p className="mt-3 whitespace-pre-wrap text-sm">
                          {question.context}
                        </p>
                      )}

                      {(question.ifWeDoIt ||
                        question.whatItCosts ||
                        question.ifWeDont) && (
                        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                          {question.ifWeDoIt && (
                            <div>
                              <dt className="text-xs font-medium text-muted">
                                If we do it
                              </dt>
                              <dd className="mt-1 whitespace-pre-wrap text-sm">
                                {question.ifWeDoIt}
                              </dd>
                            </div>
                          )}
                          {question.whatItCosts && (
                            <div>
                              <dt className="text-xs font-medium text-muted">
                                What it costs
                              </dt>
                              <dd className="mt-1 whitespace-pre-wrap text-sm">
                                {question.whatItCosts}
                              </dd>
                            </div>
                          )}
                          {question.ifWeDont && (
                            <div>
                              <dt className="text-xs font-medium text-muted">
                                If we don&rsquo;t
                              </dt>
                              <dd className="mt-1 whitespace-pre-wrap text-sm">
                                {question.ifWeDont}
                              </dd>
                            </div>
                          )}
                        </dl>
                      )}

                      {question.task ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <Link
                            href={`/projects/${project.id}/milestones/${question.task.milestoneId}`}
                            className="rounded text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            On the board ·{" "}
                            {taskStatusLabel[question.task.status as TaskStatus]}
                          </Link>
                          {question.decision && (
                            <p className="w-full text-sm text-muted">
                              <span className="font-medium">Decision: </span>
                              {question.decision}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted">Status</span>
                            <QuestionStatusControl
                              questionId={question.id}
                              status={question.status as QuestionStatus}
                            />
                          </div>
                          <AdoptQuestionForm
                            questionId={question.id}
                            milestones={milestones}
                            defaultMilestoneId={question.milestoneId ?? ""}
                          />
                        </div>
                      )}

                      <div className="mt-4">
                        <CommentSection
                          key={`question-${question.id}-${(commentsByQuestion[question.id] ?? [])
                            .map((comment) => comment.id)
                            .join("-")}`}
                          targetType="QUESTION"
                          targetId={question.id}
                          currentUserId={session.user.id}
                          initialComments={commentsByQuestion[question.id] ?? []}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
