import { describe, expect, it } from "vitest";
import {
  createDeliverableSchema,
  saveMilestoneDetailsSchema,
  toggleDeliverableSchema,
  updateDeliverableSchema,
} from "@/lib/validation";

const base = {
  milestoneId: "m1",
  title: "Working upload page",
};

describe("createDeliverableSchema", () => {
  it("normalises a blank link to null", () => {
    const parsed = createDeliverableSchema.parse({ ...base, url: "" });
    expect(parsed.url).toBeNull();
  });

  it("keeps a valid https link", () => {
    const parsed = createDeliverableSchema.parse({
      ...base,
      url: "https://example.com/deliverable",
    });
    expect(parsed.url).toBe("https://example.com/deliverable");
  });

  it("rejects a blank title", () => {
    expect(
      createDeliverableSchema.safeParse({ ...base, title: "   " }).success,
    ).toBe(false);
  });

  it("rejects a link that is not http(s)", () => {
    for (const url of ["javascript:alert(1)", "not a url", "ftp://x/y"]) {
      expect(createDeliverableSchema.safeParse({ ...base, url }).success).toBe(
        false,
      );
    }
  });
});

describe("updateDeliverableSchema", () => {
  it("needs the deliverable id", () => {
    expect(updateDeliverableSchema.safeParse({ ...base }).success).toBe(false);
    expect(
      updateDeliverableSchema.safeParse({ ...base, deliverableId: "d1" }).success,
    ).toBe(true);
  });
});

describe("toggleDeliverableSchema", () => {
  it("only accepts true or false strings", () => {
    expect(
      toggleDeliverableSchema.safeParse({ deliverableId: "d1", done: "true" })
        .success,
    ).toBe(true);
    expect(
      toggleDeliverableSchema.safeParse({ deliverableId: "d1", done: "false" })
        .success,
    ).toBe(true);
    expect(
      toggleDeliverableSchema.safeParse({ deliverableId: "d1", done: "yes" })
        .success,
    ).toBe(false);
  });
});

describe("saveMilestoneDetailsSchema", () => {
  it("normalises blank fields to null", () => {
    const parsed = saveMilestoneDetailsSchema.parse({
      milestoneId: "m1",
      scope: "",
      definitionOfDone: "   ",
    });
    expect(parsed.scope).toBeNull();
    expect(parsed.definitionOfDone).toBeNull();
  });

  it("keeps written fields", () => {
    const parsed = saveMilestoneDetailsSchema.parse({
      milestoneId: "m1",
      scope: "Upload only",
      definitionOfDone: "A file lands on disk.",
    });
    expect(parsed.scope).toBe("Upload only");
    expect(parsed.definitionOfDone).toBe("A file lands on disk.");
  });
});
