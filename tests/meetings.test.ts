import { describe, expect, it } from "vitest";
import {
  MAX_ACTION_LINES,
  MAX_ACTION_LINE_LENGTH,
  parseActionLines,
} from "@/lib/meetings";

describe("parseActionLines", () => {
  it("splits on newlines and trims each line", () => {
    expect(parseActionLines("Draft the review\n  Book the lab  ")).toEqual([
      "Draft the review",
      "Book the lab",
    ]);
  });

  it("strips bullet and number markers", () => {
    expect(parseActionLines("- one\n* two\n• three\n1. four\n2) five")).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
    ]);
  });

  it("drops blank lines", () => {
    expect(parseActionLines("one\n\n   \n two ")).toEqual(["one", "two"]);
  });

  it("caps the number of agreed actions", () => {
    const many = Array.from(
      { length: MAX_ACTION_LINES + 10 },
      (_, index) => `action ${index}`,
    ).join("\n");
    expect(parseActionLines(many)).toHaveLength(MAX_ACTION_LINES);
  });

  it("caps the length of a single action", () => {
    const [line] = parseActionLines("x".repeat(MAX_ACTION_LINE_LENGTH + 50));
    expect(line).toHaveLength(MAX_ACTION_LINE_LENGTH);
  });

  it("returns nothing for non-string input", () => {
    expect(parseActionLines(null)).toEqual([]);
    expect(parseActionLines(undefined)).toEqual([]);
    expect(parseActionLines(42)).toEqual([]);
    expect(parseActionLines(["not", "text"])).toEqual([]);
  });
});
