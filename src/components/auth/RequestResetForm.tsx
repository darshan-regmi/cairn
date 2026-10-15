"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { authErrorMessage, getFirebaseAuth } from "@/lib/firebase/client";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Starts a password reset. Firebase sends the email; the response is always the
 * same so it never reveals whether an address has an account.
 */
export function RequestResetForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setSent(true);
    } catch (cause) {
      // An unknown address is reported exactly like a known one.
      if (
        cause instanceof Error &&
        "code" in cause &&
        cause.code === "auth/user-not-found"
      ) {
        setSent(true);
      } else {
        setError(authErrorMessage(cause, "Could not send the reset email."));
      }
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          If that address has an account, a reset link is on its way. Check your
          inbox and spam folder.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-md border border-edge px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
