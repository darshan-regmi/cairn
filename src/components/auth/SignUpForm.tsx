"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { registerAccount } from "@/actions/auth";
import { authErrorMessage, getFirebaseAuth } from "@/lib/firebase/client";
import { USER_ROLES, userRoleBlurb, userRoleLabel } from "@/lib/roles";

export function SignUpForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const role = String(data.get("role") ?? "NORMAL");
    const firebaseAuth = getFirebaseAuth();

    try {
      // Firebase owns the credential so it can send the verification email.
      const { user } = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password,
      );

      try {
        if (name) await updateProfile(user, { displayName: name });
        await sendEmailVerification(user);
        const idToken = await user.getIdToken();
        const result = await registerAccount({ idToken, name, role });
        if (!result.success) {
          await deleteUser(user).catch(() => {});
          setError(result.error ?? "Could not create your account.");
          return;
        }
      } catch (cause) {
        // Roll back the Firebase account so the address stays usable.
        await deleteUser(user).catch(() => {});
        throw cause;
      }

      await firebaseSignOut(firebaseAuth);
      setSentTo(email);
    } catch (cause) {
      setError(authErrorMessage(cause, "Could not create your account."));
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          Almost there. We sent a verification link to {sentTo}. Open it, then
          log in.
        </p>
        <Link
          href={
            callbackUrl
              ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
              : "/login"
          }
          className="block w-full rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-accent-ink transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          Name <span className="text-muted">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <p className="text-xs text-muted">At least 8 characters.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium">I am a…</legend>
        <div className="space-y-2">
          {USER_ROLES.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer gap-2.5 rounded-md border border-edge px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10"
            >
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={value === "NORMAL"}
                className="mt-0.5 accent-accent"
              />
              <span>
                <span className="block font-medium">
                  {userRoleLabel[value]}
                </span>
                <span className="block text-xs text-muted">
                  {userRoleBlurb[value]}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">
          Your role sets what you can do. On a project, your rights also depend
          on whether you own it or were invited to it.
        </p>
      </fieldset>

      {error && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
