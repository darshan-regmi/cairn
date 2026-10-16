// Which backing services this deployment talks to. "cloud" is the Firebase
// build (the default, and what the product runs in production); "selfhost" runs
// entirely on the operator's own Postgres and never touches Firebase.
//
// Read at call time, not at module load, so tests and the dev server pick up a
// changed value without a rebuild (same rule as src/lib/config.ts).

export type DeploymentMode = "cloud" | "selfhost";

/** The configured mode. An unknown value throws rather than silently guessing. */
export function deploymentMode(): DeploymentMode {
  const raw = process.env.DEPLOYMENT_MODE;
  if (raw === undefined || raw === "" || raw === "cloud") return "cloud";
  if (raw === "selfhost") return "selfhost";
  throw new Error(`DEPLOYMENT_MODE must be "cloud" or "selfhost", got "${raw}".`);
}

export function isSelfHost(): boolean {
  return deploymentMode() === "selfhost";
}

export function isCloud(): boolean {
  return deploymentMode() === "cloud";
}

/** A session cookie is only as strong as the secret behind its signature. */
export const MIN_SESSION_SECRET_LENGTH = 32;

/**
 * Checks the configuration the current mode needs, so a misconfigured container
 * fails at startup instead of on someone's first login. Called from
 * src/instrumentation.ts.
 *
 * Cloud mode is deliberately left alone: its checks stay lazy (the Firebase
 * admin module throws when first used), so nothing about cloud changes.
 */
export function assertDeploymentConfig(): void {
  // `next build` imports server modules to collect metadata; it must not need
  // runtime configuration.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (deploymentMode() !== "selfhost") return;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if ((process.env.SESSION_SECRET ?? "").length < MIN_SESSION_SECRET_LENGTH) {
    missing.push(
      `SESSION_SECRET (generate at least ${MIN_SESSION_SECRET_LENGTH} characters)`,
    );
  }
  if (missing.length > 0) {
    throw new Error(
      `Self-hosted mode is missing required configuration: ${missing.join(", ")}. ` +
        "See .env.selfhost.example for every variable.",
    );
  }
}
