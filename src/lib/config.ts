// Environment-driven feature flags. Read at call time (not module load) so the
// dev server and tests pick up changes without a rebuild.

/**
 * Whether new accounts can be created.
 *
 * Unset or empty means open, so a fresh checkout works out of the box. Set
 * `ALLOW_SIGNUP=false` (or `0`) to close registration once your own account
 * exists. Any other value is treated as closed, so a typo fails safe.
 */
export function isSignupAllowed(): boolean {
  const value = process.env.ALLOW_SIGNUP;
  if (value === undefined || value === "") return true;
  return value === "true" || value === "1";
}
