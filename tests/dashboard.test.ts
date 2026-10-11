import { describe, expect, it } from "vitest";
import {
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
