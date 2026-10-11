import { describe, expect, it } from "vitest";
import { rescheduleMilestoneSchema } from "@/lib/validation";

const base = {
  milestoneId: "m1",
  plannedStart: "2026-06-01",
  plannedEnd: "2026-06-30",
};

describe("rescheduleMilestoneSchema", () => {
  it("accepts an end date on or after the start", () => {
    expect(rescheduleMilestoneSchema.safeParse(base).success).toBe(true);
    expect(
      rescheduleMilestoneSchema.safeParse({
        ...base,
        plannedStart: "2026-06-15",
        plannedEnd: "2026-06-15",
      }).success,
    ).toBe(true);
  });

  it("rejects an end date before the start", () => {
    const result = rescheduleMilestoneSchema.safeParse({
      ...base,
      plannedStart: "2026-06-30",
      plannedEnd: "2026-06-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["plannedEnd"]);
    }
  });

  it("requires YYYY-MM-DD dates", () => {
    expect(
      rescheduleMilestoneSchema.safeParse({
        ...base,
        plannedStart: "01/06/2026",
      }).success,
    ).toBe(false);
  });
});
