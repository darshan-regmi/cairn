import { describe, expect, it } from "vitest";
import {
  daysBetween,
  daysLeft,
  fromDateInput,
  isCurrent,
  isOverdue,
  taskProgress,
  toDateInput,
  toStartOfDay,
} from "@/lib/milestone-metrics";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("taskProgress", () => {
  it("returns 0% for an empty milestone", () => {
    expect(taskProgress([])).toEqual({
      totalTasks: 0,
      doneTasks: 0,
      progressPercent: 0,
    });
  });

  it("falls back to 0% when tasks is undefined", () => {
    expect(taskProgress(undefined as never)).toEqual({
      totalTasks: 0,
      doneTasks: 0,
      progressPercent: 0,
    });
  });

  it("computes the percentage of DONE tasks", () => {
    const tasks = [
      { status: "DONE" },
      { status: "IN_PROGRESS" },
      { status: "TODO" },
      { status: "DONE" },
    ];
    expect(taskProgress(tasks)).toEqual({
      totalTasks: 4,
      doneTasks: 2,
      progressPercent: 50,
    });
  });

  it("is 100% when everything is done", () => {
    expect(taskProgress([{ status: "DONE" }, { status: "DONE" }])).toEqual({
      totalTasks: 2,
      doneTasks: 2,
      progressPercent: 100,
    });
  });
});

describe("isOverdue", () => {
  const today = day(2026, 10, 10);

  it("flags an unfinished task with a due date before today", () => {
    expect(isOverdue({ status: "TODO", due: day(2026, 10, 9) }, today)).toBe(
      true,
    );
  });

  it("does not flag a task due today", () => {
    expect(isOverdue({ status: "TODO", due: today }, today)).toBe(false);
  });

  it("does not flag a task due in the future", () => {
    expect(isOverdue({ status: "IN_PROGRESS", due: day(2026, 10, 20) }, today)).toBe(
      false,
    );
  });

  it("never flags a DONE task even with an old due date", () => {
    expect(isOverdue({ status: "DONE", due: day(2026, 9, 1) }, today)).toBe(false);
  });

  it("does not flag a task with no due date", () => {
    expect(isOverdue({ status: "TODO", due: null }, today)).toBe(false);
    expect(isOverdue({ status: "BLOCKED", due: undefined }, today)).toBe(false);
  });

  it("accepts a serialized date string", () => {
    expect(
      isOverdue({ status: "TODO", due: "2026-10-09T00:00:00.000Z" }, today),
    ).toBe(true);
  });
});

describe("daysLeft", () => {
  const today = day(2026, 10, 10);

  it("returns 0 when the milestone ends today", () => {
    expect(daysLeft({ plannedEnd: today }, today)).toBe(0);
  });

  it("returns positive days when the end is in the future", () => {
    expect(daysLeft({ plannedEnd: day(2026, 10, 17) }, today)).toBe(7);
  });

  it("returns a negative number when the milestone is late", () => {
    expect(daysLeft({ plannedEnd: day(2026, 10, 3) }, today)).toBe(-7);
  });

  it("handles missing end date by treating it as today", () => {
    expect(daysLeft({}, today)).toBe(0);
  });
});

describe("daysBetween / toStartOfDay", () => {
  it("round-trips through local midnight", () => {
    expect(toStartOfDay(new Date(2026, 9, 10, 23, 59, 59))).toEqual(
      day(2026, 10, 10),
    );
    expect(toStartOfDay("2026-10-10T12:00:00.000Z").getDate()).toBe(10);
  });

  it("counts whole days regardless of the time of day", () => {
    const a = new Date(2026, 9, 10, 22, 0, 0);
    const b = new Date(2026, 9, 13, 1, 0, 0);
    expect(daysBetween(a, b)).toBe(3);
  });
});

describe("isCurrent", () => {
  const today = day(2026, 10, 10);

  it("is true when today is inside the planned range", () => {
    expect(
      isCurrent(
        { plannedStart: day(2026, 10, 1), plannedEnd: day(2026, 10, 31) },
        today,
      ),
    ).toBe(true);
  });

  it("is true on the boundary days", () => {
    expect(
      isCurrent({ plannedStart: today, plannedEnd: day(2026, 10, 31) }, today),
    ).toBe(true);
    expect(isCurrent({ plannedStart: day(2026, 10, 1), plannedEnd: today }, today)).toBe(
      true,
    );
  });

  it("is false before the start or after the end", () => {
    expect(
      isCurrent({ plannedStart: day(2026, 11, 1), plannedEnd: day(2026, 11, 30) }, today),
    ).toBe(false);
    expect(
      isCurrent({ plannedStart: day(2026, 9, 1), plannedEnd: day(2026, 9, 30) }, today),
    ).toBe(false);
  });

  it("is false when dates are missing", () => {
    expect(isCurrent({}, today)).toBe(false);
  });
});

describe("date input helpers", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(toDateInput(day(2026, 10, 3))).toBe("2026-10-03");
  });

  it("parses YYYY-MM-DD back to local midnight", () => {
    expect(fromDateInput("2026-10-03")).toEqual(day(2026, 10, 3));
  });
});