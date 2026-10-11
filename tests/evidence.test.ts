import { describe, expect, it } from "vitest";
import { createEvidenceSchema, updateEvidenceSchema } from "@/lib/validation";

const base = {
  milestoneId: "m1",
  title: "End-to-end demo",
  date: "2026-06-15",
  type: "DEMO" as const,
};

describe("createEvidenceSchema", () => {
  it("normalises blank optionals to null", () => {
    const parsed = createEvidenceSchema.parse({
      ...base,
      url: "",
      whatItProves: "",
    });
    expect(parsed.url).toBeNull();
    expect(parsed.whatItProves).toBeNull();
  });

  it("keeps a valid https link", () => {
    const parsed = createEvidenceSchema.parse({
      ...base,
      url: "https://example.com/evidence",
    });
    expect(parsed.url).toBe("https://example.com/evidence");
  });

  it("rejects a blank title", () => {
    expect(
      createEvidenceSchema.safeParse({ ...base, title: "   " }).success,
    ).toBe(false);
  });

  it("rejects a link that is not http(s)", () => {
    for (const url of ["javascript:alert(1)", "not a url", "ftp://x/y"]) {
      expect(createEvidenceSchema.safeParse({ ...base, url }).success).toBe(
        false,
      );
    }
  });

  it("rejects an unknown evidence type", () => {
    expect(
      createEvidenceSchema.safeParse({ ...base, type: "SCREENSHOT?" }).success,
    ).toBe(false);
  });

  it("requires a YYYY-MM-DD date", () => {
    expect(
      createEvidenceSchema.safeParse({ ...base, date: "15/06/2026" }).success,
    ).toBe(false);
  });
});

describe("updateEvidenceSchema", () => {
  it("needs the evidence id", () => {
    expect(updateEvidenceSchema.safeParse({ ...base }).success).toBe(false);
    expect(
      updateEvidenceSchema.safeParse({ ...base, evidenceId: "e1" }).success,
    ).toBe(true);
  });
});
