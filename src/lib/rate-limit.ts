// A small in-memory limiter for the sign-in, sign-up and reset endpoints.
//
// Only *failed* attempts are counted, so a person logging in normally never
// locks themselves out.
//
// shortcut: single instance only — the counters live in this process and reset
// on restart. That is the right size for the one-container self-host deployment
// this exists for; move the counters to a shared store before scaling out.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_FAILURES = 10;

/** Whether `key` has had too many recent failures. */
export function isRateLimited(
  key: string,
  limit = RATE_LIMIT_MAX_FAILURES,
  windowMs = RATE_LIMIT_WINDOW_MS,
  now = Date.now(),
): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return false;
  return bucket.count >= limit;
}

/** Records one failed attempt against `key`. */
export function recordFailure(
  key: string,
  windowMs = RATE_LIMIT_WINDOW_MS,
  now = Date.now(),
): void {
  // Keep the map from growing without bound on a busy or hostile instance.
  if (buckets.size > 10_000) {
    for (const [candidate, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(candidate);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

/** Forgets a key's failures, e.g. after a successful sign-in. */
export function clearFailures(key: string): void {
  buckets.delete(key);
}

/** Test seam. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** The message shown whenever a key is over the limit. */
export const RATE_LIMITED_MESSAGE =
  "Too many attempts. Wait a few minutes and try again.";
