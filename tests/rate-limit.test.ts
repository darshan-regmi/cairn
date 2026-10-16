import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFailures,
  isRateLimited,
  RATE_LIMIT_MAX_FAILURES,
  RATE_LIMIT_WINDOW_MS,
  recordFailure,
  resetRateLimits,
} from "@/lib/rate-limit";

beforeEach(() => resetRateLimits());

const KEY = "signin:ada@example.com";

function fail(key: string, times: number, windowMs?: number, now?: number) {
  for (let i = 0; i < times; i += 1) recordFailure(key, windowMs, now);
}

describe("rate limiting", () => {
  it("stays open below the limit", () => {
    fail(KEY, RATE_LIMIT_MAX_FAILURES - 1);
    expect(isRateLimited(KEY)).toBe(false);
  });

  it("blocks once the limit is reached", () => {
    fail(KEY, RATE_LIMIT_MAX_FAILURES);
    expect(isRateLimited(KEY)).toBe(true);
  });

  it("counts each key separately, so one attacker cannot lock everyone out", () => {
    fail(KEY, RATE_LIMIT_MAX_FAILURES);
    expect(isRateLimited("signin:grace@example.com")).toBe(false);
  });

  it("forgets a key as soon as a real attempt succeeds", () => {
    fail(KEY, RATE_LIMIT_MAX_FAILURES);
    clearFailures(KEY);
    expect(isRateLimited(KEY)).toBe(false);
  });

  it("reopens after the window has passed", () => {
    const start = Date.UTC(2026, 0, 1);
    fail(KEY, RATE_LIMIT_MAX_FAILURES, RATE_LIMIT_WINDOW_MS, start);
    expect(
      isRateLimited(KEY, RATE_LIMIT_MAX_FAILURES, RATE_LIMIT_WINDOW_MS, start),
    ).toBe(true);
    const later = start + RATE_LIMIT_WINDOW_MS + 1;
    expect(
      isRateLimited(KEY, RATE_LIMIT_MAX_FAILURES, RATE_LIMIT_WINDOW_MS, later),
    ).toBe(false);
  });
});
