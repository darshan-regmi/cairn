// Runs once per server instance, before it starts serving. A self-host
// deployment with missing or weak configuration should fail here rather than
// half-work later.

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertDeploymentConfig } = await import("./lib/deployment");
  assertDeploymentConfig();
}
