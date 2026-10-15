"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// The browser talks to Firebase Auth directly: it creates accounts (so it can
// send the verification email) and signs in. These keys are public by design —
// the Admin SDK key (see ./admin.ts) is the only secret.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** The shared Firebase Auth client, initialised once per page load. */
export function getFirebaseAuth(): Auth {
  const app = getApps()[0] ?? initializeApp(config);
  return getAuth(app);
}

/** Turns a Firebase Auth error code into something a person can act on. */
export function authErrorMessage(error: unknown, fallback: string): string {
  switch ((error as { code?: string })?.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    default:
      return fallback;
  }
}
