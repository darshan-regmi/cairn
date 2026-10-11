import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/navigation";

describe("safeCallbackUrl", () => {
  it("keeps same-site relative paths", () => {
    expect(safeCallbackUrl("/supervisor")).toBe("/supervisor");
    expect(safeCallbackUrl("/invite/abc123")).toBe("/invite/abc123");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeCallbackUrl("https://evil.example")).toBeUndefined();
    expect(safeCallbackUrl("//evil.example")).toBeUndefined();
    expect(safeCallbackUrl("http://localhost:3000/x")).toBeUndefined();
  });

  it("rejects empty or non-string values", () => {
    expect(safeCallbackUrl("")).toBeUndefined();
    expect(safeCallbackUrl("supervisor")).toBeUndefined();
    expect(safeCallbackUrl(undefined)).toBeUndefined();
    expect(safeCallbackUrl(42)).toBeUndefined();
  });
});
