"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPassword } from "@/actions/auth";

export function LoginForm({
  callbackUrl,
  mode,
}: {
  callbackUrl?: string;
  mode: "cloud" | "selfhost";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    try {
      if (mode === "selfhost") {
        const result = await signInWithPassword({ email, password });
        if (!result.success) {
          setError(result.error ?? "Email or password is incorrect.");
          return;
        }
        router.push(callbackUrl || "/dashboard");
        router.refresh();
        return;
      }

      const {
        signInWithEmailAndPassword,
        sendEmailVerification,
        signOut: firebaseSignOut,
      } = await import("firebase/auth");
      const { authErrorMessage, getFirebaseAuth } = await import(
        "@/lib/firebase/client"
      );
      const firebaseAuth = getFirebaseAuth();

      try {
        const { user } = await signInWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
        await user.reload();

        if (!user.emailVerified) {
          // Nudge them with a fresh link, then refuse the session.
          await sendEmailVerification(user).catch(() => {});
          await firebaseSignOut(firebaseAuth);
          setError(`Verify your email first — we sent a fresh link to ${email}.`);
          return;
        }

        // Swap the short-lived ID token for an httpOnly session cookie.
        const idToken = await user.getIdToken();
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
          await firebaseSignOut(firebaseAuth);
          setError("Could not start your session. Try again.");
          return;
        }

        router.push(callbackUrl || "/dashboard");
        router.refresh();
      } catch (cause) {
        setError(authErrorMessage(cause, "Email or password is incorrect."));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          className="w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
