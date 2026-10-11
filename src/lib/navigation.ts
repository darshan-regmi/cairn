// Post-login redirect helper. Only same-site relative paths are allowed so a
// crafted ?callbackUrl= cannot send a user to another origin.

export function safeCallbackUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Must be site-relative: starts with "/" but not "//" (protocol-relative).
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}
