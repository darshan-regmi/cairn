import { describe, expect, it } from "vitest";
import {
  summarizeSupervisedProjects,
  type SupervisedProjectInput,
} from "@/lib/supervisor";

const TODAY = new Date(2026, 5, 15); // 15 June 2026, local midnight

function project(
  overrides: Partial<SupervisedProjectInput> = {},
): SupervisedProjectInput {
  return {
    id: "p1",
    title: "Project",
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 11, 31),
    milestones: [],
    meetings: [],
    ...overrides,
  };
}

describe("summarizeSupervisedProjects", () => {
  it("marks a project on track when nothing is overdue", () => {
    const [summary] = summarizeSupervisedProjects(
      [
        project({
          milestones: [
            {
              status: "IN_PROGRESS",
              plannedEnd: new Date(2026, 7, 1),
              tasks: [{ status: "TODO", due: new Date(2026, 7, 1) }],
            },
          ],
        }),
      ],
      TODAY,
    );

    expect(summary.isBehind).toBe(false);
    expect(summary.milestoneCount).toBe(1);
  });

  it("marks a project behind when a task is overdue", () => {
    const [summary] = summarizeSupervisedProjects(
      [
        project({
          milestones: [
            {
              status: "IN_PROGRESS",
              plannedEnd: new Date(2026, 7, 1),
              tasks: [{ status: "TODO", due: new Date(2026, 5, 10) }],
            },
          ],
        }),
      ],
      TODAY,
    );

    expect(summary.isBehind).toBe(true);
  });

  it("ignores a done task with a past due date", () => {
    const [summary] = summarizeSupervisedProjects(
      [
        project({
          milestones: [
            {
              status: "IN_PROGRESS",
              plannedEnd: new Date(2026, 7, 1),
              tasks: [{ status: "DONE", due: new Date(2026, 5, 10) }],
            },
          ],
        }),
      ],
      TODAY,
    );

    expect(summary.isBehind).toBe(false);
  });

  it("marks a project behind when a milestone slipped past its end date", () => {
    const [summary] = summarizeSupervisedProjects(
      [
        project({
          milestones: [
            {
              status: "IN_PROGRESS",
              plannedEnd: new Date(2026, 5, 1),
              tasks: [],
            },
          ],
        }),
      ],
      TODAY,
    );

    expect(summary.isBehind).toBe(true);
  });

  it("treats a done milestone past its end date as on track", () => {
    const [summary] = summarizeSupervisedProjects(
      [
        project({
          milestones: [
            { status: "DONE", plannedEnd: new Date(2026, 5, 1), tasks: [] },
          ],
        }),
      ],
      TODAY,
    );

    expect(summary.isBehind).toBe(false);
  });

  it("picks the nearest upcoming meeting and ignores past dates", () => {
    const [summary] = summarizeSupervisedProjects(
      [
        project({
          meetings: [
            { date: new Date(2026, 5, 3), nextMeetingDate: new Date(2026, 6, 1) },
            { date: new Date(2026, 4, 20), nextMeetingDate: new Date(2026, 5, 20) },
            { date: new Date(2026, 4, 1), nextMeetingDate: new Date(2026, 5, 5) },
            { date: new Date(2026, 3, 1), nextMeetingDate: null },
          ],
        }),
      ],
      TODAY,
    );

    expect(summary.nextMeetingDate?.getTime()).toBe(
      new Date(2026, 5, 20).getTime(),
    );
  });

  it("returns null when no meeting is scheduled ahead", () => {
    const [summary] = summarizeSupervisedProjects(
      [
        project({
          meetings: [
            { date: new Date(2026, 4, 1), nextMeetingDate: new Date(2026, 5, 1) },
          ],
        }),
      ],
      TODAY,
    );

    expect(summary.nextMeetingDate).toBeNull();
  });
});
