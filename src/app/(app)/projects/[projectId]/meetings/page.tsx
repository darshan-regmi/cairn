import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  findMeetingsForUser,
  listCommentsForTargets,
  projectExists,
} from "@/lib/data";
import { projectRoleFor } from "@/lib/access";
import { deleteMeetingAction, deleteMeetingTaskAction } from "@/actions/meetings";
import { toDateInput } from "@/lib/milestone-metrics";
import { taskStatusLabel, type TaskStatus } from "@/lib/status";
import {
  AddMeetingPanel,
  EditMeetingPanel,
  type MeetingFormValues,
} from "@/components/meetings/MeetingForm";
import {
  AddActionForm,
  ConvertActionForm,
} from "@/components/meetings/MeetingActions";
import { CommentSection } from "@/components/comments/CommentSection";
import { groupCommentsByTarget } from "@/lib/comments";

type MeetingsProject = NonNullable<
  Awaited<ReturnType<typeof findMeetingsForUser>>
>;
type MeetingRow = MeetingsProject["meetings"][number];

function toFormValues(meeting: MeetingRow): MeetingFormValues {
  return {
    id: meeting.id,
    date: toDateInput(meeting.date),
    nextMeetingDate: meeting.nextMeetingDate
      ? toDateInput(meeting.nextMeetingDate)
      : "",
    milestoneId: meeting.milestoneId ?? "",
    itemsDiscussed: meeting.itemsDiscussed ?? "",
    achievements: meeting.achievements ?? "",
    problems: meeting.problems ?? "",
  };
}

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId } = await params;
  const project = await findMeetingsForUser(projectId, session.user.id);
  if (!project) {
    if (await projectExists(projectId)) redirect("/no-access");
    notFound();
  }

  // Supervisors read meetings through the read-only supervisor view.
  const role = await projectRoleFor(project.id, session.user.id);
  if (role === "SUPERVISOR") redirect(`/supervisor/${project.id}`);

  const milestones = project.milestones.map((milestone) => ({
    id: milestone.id,
    name: milestone.name,
  }));

  const commentsByMeeting = groupCommentsByTarget(
    await listCommentsForTargets(
      "MEETING",
      project.meetings.map((meeting) => meeting.id),
    ),
  );

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
          <h1 className="text-2xl tracking-tight">Meetings</h1>
          <p className="mt-1 text-sm text-muted">
            Keep a record of what was discussed, then turn any agreed action
            into a board card in one click.
          </p>
        </div>
        <AddMeetingPanel projectId={project.id} milestones={milestones} />
      </header>

      {project.meetings.length === 0 ? (
        <section className="mt-16 rounded-lg border border-dashed border-edge p-10 text-center">
          <h2 className="text-lg font-medium">No meetings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Log your first supervision meeting to keep a running record of
            decisions and agreed actions.
          </p>
        </section>
      ) : (
        <ol className="mt-10 space-y-5">
          {project.meetings.map((meeting) => (
            <li key={meeting.id} className="rounded-lg border border-edge p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{toDateInput(meeting.date)}</h2>
                  {meeting.milestone && (
                    <span className="rounded-full border border-edge px-2 py-0.5 text-xs text-muted">
                      {meeting.milestone.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <EditMeetingPanel
                    projectId={project.id}
                    milestones={milestones}
                    meeting={toFormValues(meeting)}
                  />
                  <form action={deleteMeetingAction}>
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <button
                      type="submit"
                      className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              {meeting.nextMeetingDate && (
                <p className="mt-1 text-xs text-muted">
                  Next meeting: {toDateInput(meeting.nextMeetingDate)}
                </p>
              )}

              {meeting.itemsDiscussed && (
                <div className="mt-3">
                  <h3 className="text-xs font-medium text-muted">
                    Items discussed
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {meeting.itemsDiscussed}
                  </p>
                </div>
              )}

              {meeting.achievements && (
                <div className="mt-3">
                  <h3 className="text-xs font-medium text-muted">
                    What went well
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {meeting.achievements}
                  </p>
                </div>
              )}

              {meeting.problems && (
                <div className="mt-3">
                  <h3 className="text-xs font-medium text-muted">Problems</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {meeting.problems}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-xs font-medium text-muted">
                  Agreed actions
                </h3>
                {meeting.actionItems.length === 0 ? (
                  <p className="mt-1 text-sm text-muted">None yet.</p>
                ) : (
                  <ul className="mt-1 space-y-2">
                    {meeting.actionItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="min-w-0 flex-1">{item.text}</span>
                        {item.task ? (
                          <Link
                            href={`/projects/${project.id}/milestones/${item.task.milestoneId}`}
                            className="rounded text-xs text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            On the board ·{" "}
                            {taskStatusLabel[item.task.status as TaskStatus]}
                          </Link>
                        ) : (
                          <>
                            <ConvertActionForm
                              meetingTaskId={item.id}
                              milestones={milestones}
                              defaultMilestoneId={meeting.milestoneId ?? ""}
                            />
                            <form action={deleteMeetingTaskAction}>
                              <input
                                type="hidden"
                                name="meetingTaskId"
                                value={item.id}
                              />
                              <button
                                type="submit"
                                className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                              >
                                Remove
                              </button>
                            </form>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <AddActionForm meetingId={meeting.id} />
              </div>

              <div className="mt-4">
                <CommentSection
                  key={`meeting-${meeting.id}-${(commentsByMeeting[meeting.id] ?? [])
                    .map((comment) => comment.id)
                    .join("-")}`}
                  targetType="MEETING"
                  targetId={meeting.id}
                  currentUserId={session.user.id}
                  initialComments={commentsByMeeting[meeting.id] ?? []}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
