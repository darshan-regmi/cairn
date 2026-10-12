import { describe, expect, it } from "vitest";
import {
  USER_ROLES,
  canOwnProjects,
  canUseResearchTools,
  userRoleBlurb,
  userRoleLabel,
} from "@/lib/roles";

describe("account roles", () => {
  it("lists the three roles", () => {
    expect(USER_ROLES).toEqual(["NORMAL", "STUDENT", "SUPERVISOR"]);
  });

  it("has a label and a blurb for every role", () => {
    for (const role of USER_ROLES) {
      expect(userRoleLabel[role]).toBeTruthy();
      expect(userRoleBlurb[role]).toBeTruthy();
    }
  });

  it("lets only students use the research tools", () => {
    expect(canUseResearchTools("STUDENT")).toBe(true);
    expect(canUseResearchTools("NORMAL")).toBe(false);
    expect(canUseResearchTools("SUPERVISOR")).toBe(false);
    expect(canUseResearchTools(null)).toBe(false);
    expect(canUseResearchTools(undefined)).toBe(false);
  });

  it("stops supervisors owning projects, but allows everyone else", () => {
    expect(canOwnProjects("NORMAL")).toBe(true);
    expect(canOwnProjects("STUDENT")).toBe(true);
    expect(canOwnProjects("SUPERVISOR")).toBe(false);
  });
});
