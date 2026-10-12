import { describe, expect, it } from "vitest";
import {
  pickActiveWork,
  summarizeDashboard,
  type DashboardMilestoneInput,
  type DashboardProjectInput,
  type DashboardTaskInput,
} from "@/lib/dashboard";

const TODAY = new Date(2026, 5, 15); // 15 June 2026, local midnight

function task(
  id: string,
  overrides: Partial<DashboardTaskInput> = {},
): DashboardTaskInput {
  return {
    id,
    title: `Task ${id}`,
    status: "TODO",
    due: null,
    priority: "MEDIUM",
    ...overrides,
  };
}

function milestone(
  id: string,
  plannedEnd: Date,
  tasks: DashboardTaskInput[],
  status = "IN_PROGRESS",
): DashboardMilestoneInput {
  return { id, name: `Milestone ${id}`, status, plannedEnd, tasks };
}

function project(
  id: string,
  milestones: DashboardMilestoneInput[],
): DashboardProjectInput {
  return {
    id,
    title: `Project ${id}`,
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 11, 31),
    milestones,
  };
}

describe("summarizeDashboard", () => {
  it("totals milestones and tasks across projects", () => {
    const summary = summarizeDashboard(
      [
        project("a", [
          milestone("a1", new Date(2026, 6, 1), [
            task("t1", { status: "DONE" }),
            task("t2"),
          ]),
        ]),
        project("b", [
          milestone("b1", new Date(2026, 7, 1), [task("t3", { status: "DONE" })]),
        ]),
      ],
      TODAY,
    );

    expect(summary.projectCount).toBe(2);
    expect(summary.milestoneCount).toBe(2);
    expect(summary.progress).toEqual({
      totalTasks: 3,
      doneTasks: 2,
      progressPercent: 67,
    });
    expect(summary.projects.map((p) => p.id)).toEqual(["a", "b"]);
    expect(summary.projects[0].progress).toEqual({
      totalTasks: 2,
      doneTasks: 1,
      progressPercent: 50,
    });
  });

  it("lists only not-done tasks past their due date, with context", () => {
    const summary = summarizeDashboard(
      [
        project("a", [
          milestone("a1", new Date(2026, 6, 1), [
            task("late", {
              title: "Late one",
              due: new Date(2026, 5, 10),
              priority: "HIGH",
            }),
            task("done", { due: new Date(2026, 5, 1), status: "DONE" }),
            task("future", { due: new Date(2026, 5, 20) }),
            task("undated"),
          ]),
        ]),
      ],
      TODAY,
    );

    expect(summary.overdue).toHaveLength(1);
    expect(summary.overdue[0]).toMatchObject({
      id: "late",
      title: "Late one",
      priority: "HIGH",
      daysLate: 5,
      projectId: "a",
      projectTitle: "Project a",
      milestoneId: "a1",
      milestoneName: "Milestone a1",
    });
  });

  it("orders overdue tasks oldest first", () => {
    const summary = summarizeDashboard(
      [
        project("a", [
          milestone("a1", new Date(2026, 6, 1), [
            task("newer", { due: new Date(2026, 5, 14) }),
            task("older", { due: new Date(2026, 5, 2) }),
          ]),
        ]),
      ],
      TODAY,
    );

    expect(summary.overdue.map((t) => t.id)).toEqual(["older", "newer"]);
  });

  it("shows milestones that have not ended, soonest first, skipping done ones", () => {
    const summary = summarizeDashboard(
      [
        project("a", [
          milestone("past", new Date(2026, 5, 1), []),
          milestone("soon", new Date(2026, 5, 18), [task("t", { status: "DONE" })]),
          milestone("later", new Date(2026, 6, 5), []),
          milestone("finished", new Date(2026, 6, 20), [], "DONE"),
          milestone("today", new Date(2026, 5, 15), []),
        ]),
      ],
      TODAY,
    );

    expect(summary.upcoming.map((m) => m.id)).toEqual([
      "today",
      "soon",
      "later",
    ]);
    expect(summary.upcoming[1].progress.progressPercent).toBe(100);
  });

  it("caps the upcoming list", () => {
    const milestones = Array.from({ length: 8 }, (_, i) =>
      milestone(`m${i}`, new Date(2026, 6, i + 1), []),
    );
    const summary = summarizeDashboard([project("a", milestones)], TODAY, 3);
    expect(summary.upcoming).toHaveLength(3);
  });

  it("is empty for no projects", () => {
    const summary = summarizeDashboard([], TODAY);
    expect(summary).toMatchObject({
      projectCount: 0,
      milestoneCount: 0,
      overdue: [],
      upcoming: [],
      projects: [],
    });
    expect(summary.progress).toEqual({
      totalTasks: 0,
      doneTasks: 0,
      progressPercent: 0,
    });
  });
});

describe("summarizeDashboard extras", () => {
  it("lists tasks due today or within the next week, skipping done and distant ones", () => {
    const summary = summarizeDashboard(
      [
        project("a", [
          milestone("a1", new Date(2026, 6, 1), [
            task("today", { due: new Date(2026, 5, 15) }),
            task("soon", { due: new Date(2026, 5, 22) }),
            task("later", { due: new Date(2026, 5, 25) }),
            task("done", { due: new Date(2026, 5, 16), status: "DONE" }),
            task("late", { due: new Date(2026, 5, 1) }),
            task("undated"),
          ]),
        ]),
      ],
      TODAY,
    );

    expect(summary.dueSoon.map((t) => t.id)).toEqual(["today", "soon"]);
    expect(summary.dueSoon[0].daysUntilDue).toBe(0);
    expect(summary.dueSoon[1].daysUntilDue).toBe(7);
  });

  it("collects blocked tasks with their context", () => {
    const summary = summarizeDashboard(
      [
        project("a", [
          milestone("a1", new Date(2026, 6, 1), [
            task("b1", { title: "Stuck", status: "BLOCKED", priority: "HIGH" }),
            task("t1"),
          ]),
        ]),
      ],
      TODAY,
    );

    expect(summary.blocked).toHaveLength(1);
    expect(summary.blocked[0]).toMatchObject({
      id: "b1",
      title: "Stuck",
      priority: "HIGH",
      projectId: "a",
      milestoneName: "Milestone a1",
    });
  });

  it("preps the latest meeting per project from its action items and problems", () => {
    const summary = summarizeDashboard(
      [
        {
          ...project("a", []),
          meetings: [
            {
              id: "newer",
              date: new Date(2026, 5, 10),
              nextMeetingDate: new Date(2026, 5, 24),
              problems: "Uploads time out.",
              actionItems: [
                {
                  id: "i1",
                  text: "Investigate timeouts",
                  task: { id: "t1", status: "IN_PROGRESS" },
                },
                { id: "i2", text: "Write notes", task: null },
              ],
            },
            {
              id: "older",
              date: new Date(2026, 4, 1),
              nextMeetingDate: null,
              problems: "Old problem",
              actionItems: [],
            },
          ],
        },
      ],
      TODAY,
    );

    expect(summary.meetingPrep).toHaveLength(1);
    expect(summary.meetingPrep[0]).toMatchObject({
      id: "newer",
      problems: "Uploads time out.",
    });
    expect(summary.meetingPrep[0].actionItems).toEqual([
      { id: "i1", text: "Investigate timeouts", taskStatus: "IN_PROGRESS" },
      { id: "i2", text: "Write notes", taskStatus: null },
    ]);
  });

  it("skips a meeting with no problems and no action items", () => {
    const summary = summarizeDashboard(
      [
        {
          ...project("a", []),
          meetings: [
            {
              id: "m1",
              date: new Date(2026, 5, 10),
              nextMeetingDate: null,
              problems: null,
              actionItems: [],
            },
          ],
        },
      ],
      TODAY,
    );

    expect(summary.meetingPrep).toEqual([]);
  });

  it("lists open questions with their project and milestone", () => {
    const summary = summarizeDashboard(
      [
        {
          ...project("a", []),
          questions: [
            {
              id: "q1",
              title: "Which database?",
              raisedAt: new Date(2026, 5, 12),
              milestoneId: "a1",
              milestone: { name: "Milestone a1" },
            },
          ],
        },
      ],
      TODAY,
    );

    expect(summary.openQuestions).toHaveLength(1);
    expect(summary.openQuestions[0]).toMatchObject({
      id: "q1",
      title: "Which database?",
      projectTitle: "Project a",
      milestoneName: "Milestone a1",
    });
  });

  it("treats every comment as unread when the watermark is null", () => {
    const summary = summarizeDashboard(
      [
        {
          ...project("a", []),
          comments: [
            {
              id: "c1",
              body: "Looks good",
              createdAt: new Date(2026, 5, 10),
              targetType: "MILESTONE",
              targetId: "a1",
              author: { name: "Sam", email: "sam@example.com" },
            },
          ],
        },
      ],
      TODAY,
      undefined,
      null,
    );

    expect(summary.unreadComments).toHaveLength(1);
    expect(summary.unreadComments[0].link).toBe("/projects/a/milestones/a1");
    expect(summary.unreadComments[0].authorName).toBe("Sam");
  });

  it("hides comments at or before the read watermark", () => {
    const summary = summarizeDashboard(
      [
        {
          ...project("a", []),
          comments: [
            {
              id: "seen",
              body: "Already read",
              createdAt: new Date(2026, 5, 10),
              targetType: "PROJECT",
              targetId: "a",
              author: { name: null, email: "sam@example.com" },
            },
            {
              id: "fresh",
              body: "Brand new",
              createdAt: new Date(2026, 5, 20),
              targetType: "MEETING",
              targetId: "m1",
              author: { name: "Sam", email: "sam@example.com" },
            },
          ],
        },
      ],
      TODAY,
      undefined,
      new Date(2026, 5, 15),
    );

    expect(summary.unreadComments.map((c) => c.id)).toEqual(["fresh"]);
    expect(summary.unreadComments[0].link).toBe("/projects/a/meetings");
  });
});

function datedMilestone(
  id: string,
  status: string,
  plannedStart: Date,
  plannedEnd: Date,
  tasks: DashboardTaskInput[] = [],
): DashboardMilestoneInput {
  return {
    id,
    name: `Milestone ${id}`,
    status,
    plannedStart,
    plannedEnd,
    tasks,
  };
}

describe("pickActiveWork", () => {
  it("prefers the phase explicitly marked in progress", () => {
    const work = pickActiveWork(
      [
        datedMilestone("a", "PLANNED", new Date(2026, 5, 1), new Date(2026, 5, 30)),
        datedMilestone("b", "IN_PROGRESS", new Date(2026, 6, 1), new Date(2026, 6, 30)),
      ],
      TODAY,
    );

    expect(work.milestone?.id).toBe("b");
  });

  it("falls back to the open phase whose dates contain today", () => {
    const work = pickActiveWork(
      [
        datedMilestone("later", "PLANNED", new Date(2026, 7, 1), new Date(2026, 8, 1)),
        datedMilestone("now", "PLANNED", new Date(2026, 5, 1), new Date(2026, 6, 1)),
      ],
      TODAY,
    );

    expect(work.milestone?.id).toBe("now");
  });

  it("falls back to the first open phase when none is current", () => {
    const work = pickActiveWork(
      [
        datedMilestone("first", "SLIPPED", new Date(2026, 0, 1), new Date(2026, 1, 1)),
        datedMilestone("second", "PLANNED", new Date(2026, 2, 1), new Date(2026, 3, 1)),
      ],
      TODAY,
    );

    expect(work.milestone?.id).toBe("first");
  });

  it("returns no phase and no tasks when everything is done", () => {
    const work = pickActiveWork(
      [datedMilestone("done", "DONE", new Date(2026, 0, 1), new Date(2026, 1, 1))],
      TODAY,
    );

    expect(work.milestone).toBeNull();
    expect(work.tasks).toEqual([]);
  });

  it("collects in-progress tasks across the project, earliest due first", () => {
    const work = pickActiveWork(
      [
        datedMilestone(
          "a",
          "IN_PROGRESS",
          new Date(2026, 5, 1),
          new Date(2026, 6, 1),
          [
            task("later", { status: "IN_PROGRESS", due: new Date(2026, 5, 20) }),
            task("todo", { status: "TODO", due: new Date(2026, 5, 1) }),
          ],
        ),
        datedMilestone(
          "b",
          "PLANNED",
          new Date(2026, 6, 1),
          new Date(2026, 7, 1),
          [
            task("late", { status: "IN_PROGRESS", due: new Date(2026, 5, 1) }),
            task("undated", { status: "IN_PROGRESS" }),
          ],
        ),
      ],
      TODAY,
    );

    expect(work.tasks.map((t) => t.id)).toEqual(["late", "later", "undated"]);
    expect(work.tasks[0].overdue).toBe(true);
    expect(work.tasks[1].daysUntilDue).toBe(5);
    expect(work.tasks[2].daysUntilDue).toBeNull();
    expect(work.tasks[0].milestoneName).toBe("Milestone b");
  });
});
