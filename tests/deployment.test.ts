import { afterEach, describe, expect, it } from "vitest";
import {
  assertDeploymentConfig,
  deploymentMode,
  isCloud,
  isSelfHost,
  MIN_SESSION_SECRET_LENGTH,
} from "@/lib/deployment";

const KEYS = [
  "DEPLOYMENT_MODE",
  "DATABASE_URL",
  "SESSION_SECRET",
  "NEXT_PHASE",
] as const;
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("deploymentMode", () => {
  it("defaults to cloud when unset or empty", () => {
    delete process.env.DEPLOYMENT_MODE;
    expect(deploymentMode()).toBe("cloud");
    process.env.DEPLOYMENT_MODE = "";
    expect(deploymentMode()).toBe("cloud");
  });

  it("accepts both known modes", () => {
    process.env.DEPLOYMENT_MODE = "cloud";
    expect(deploymentMode()).toBe("cloud");
    process.env.DEPLOYMENT_MODE = "selfhost";
    expect(deploymentMode()).toBe("selfhost");
  });

  it("refuses an unknown value instead of guessing", () => {
    process.env.DEPLOYMENT_MODE = "self-host";
    expect(() => deploymentMode()).toThrow(/DEPLOYMENT_MODE/);
  });
});

describe("mode helpers", () => {
  it("report the configured mode", () => {
    process.env.DEPLOYMENT_MODE = "selfhost";
    expect(isSelfHost()).toBe(true);
    expect(isCloud()).toBe(false);

    process.env.DEPLOYMENT_MODE = "cloud";
    expect(isSelfHost()).toBe(false);
    expect(isCloud()).toBe(true);
  });
});

describe("assertDeploymentConfig", () => {
  it("says nothing in cloud mode, however little is configured", () => {
    delete process.env.DEPLOYMENT_MODE;
    delete process.env.SESSION_SECRET;
    expect(() => assertDeploymentConfig()).not.toThrow();
  });

  it("is skipped during a production build", () => {
    process.env.DEPLOYMENT_MODE = "selfhost";
    process.env.NEXT_PHASE = "phase-production-build";
    delete process.env.SESSION_SECRET;
    expect(() => assertDeploymentConfig()).not.toThrow();
  });

  it("names the missing self-host variables", () => {
    process.env.DEPLOYMENT_MODE = "selfhost";
    delete process.env.NEXT_PHASE;
    delete process.env.SESSION_SECRET;
    expect(() => assertDeploymentConfig()).toThrow(/SESSION_SECRET/);
  });

  it("rejects a secret shorter than the minimum", () => {
    process.env.DEPLOYMENT_MODE = "selfhost";
    process.env.SESSION_SECRET = "a".repeat(MIN_SESSION_SECRET_LENGTH - 1);
    expect(() => assertDeploymentConfig()).toThrow(/SESSION_SECRET/);
  });

  it("accepts a fully configured self-host install", () => {
    process.env.DEPLOYMENT_MODE = "selfhost";
    process.env.DATABASE_URL = "postgresql://cairn:cairn@localhost:5433/cairn";
    process.env.SESSION_SECRET = "a".repeat(MIN_SESSION_SECRET_LENGTH);
    expect(() => assertDeploymentConfig()).not.toThrow();
  });
});
