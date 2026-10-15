import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

// Server-only. The Admin SDK mints the session cookie and verifies ID tokens,
// which needs a service account. Only server components, server actions and
// route handlers may import this file.
function adminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const value = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!value) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set.");
  }
  // Either a path to the downloaded key, or the JSON itself (how hosts
  // commonly inject secrets).
  const json = value.trimStart().startsWith("{")
    ? value
    : readFileSync(value, "utf8");

  return initializeApp({ credential: cert(JSON.parse(json)) });
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
