"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerAccount } from "@/actions/auth";
import { USER_ROLES, userRoleBlurb, userRoleLabel } from "@/lib/roles";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Creates an account. Cloud mode hands the credential to the Firebase SDK and
 * records the row; self-host mode posts the credentials to a server action that
 * stores them in this deployment's own database. The Firebase modules are
 * imported only on the cloud path, so a self-host browser never loads them.
 */
export function SignUpForm({
  callbackUrl,
  mode,
  verifyRequired,
}: {
  callbackUrl?: string;
  mode: "cloud" | "selfhost";
  /** False when the new account can log in straight away (self-host, no SMTP). */
  verifyRequired: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Where to send someone whose account was just created. */
  function nextHref(email: string) {
    if (verifyRequired) {
      const params = new URLSearchParams({ email });
      if (callbackUrl) params.set("callbackUrl", callbackUrl);
      return `/verify-email?${params}`;
    }
    return callbackUrl
      ? `/login?verified=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login?verified=1";
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const role = String(data.get("role") ?? "NORMAL");

    try {
      if (mode === "selfhost") {
        const result = await registerAccount({ email, password, name, role });
        if (!result.success) {
          setError(result.error ?? "Could not create your account.");
          return;
        }
        router.push(nextHref(email));
        return;
      }

      const {
        createUserWithEmailAndPassword,
        updateProfile,
        sendEmailVerification,
        deleteUser,
      } = await import("firebase/auth");
      const { getFirebaseAuth } = await import("@/lib/firebase/client");
      const firebaseAuth = getFirebaseAuth();

      // Firebase owns the credential so it can send the verification email.
      const { user } = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password,
      );

      try {
        if (name) await updateProfile(user, { displayName: name });
        const idToken = await user.getIdToken();
        // Register before mailing: a link sent first points at an account the
        // rollback below deletes, so every new address would look "used".
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

      // The row exists now, so a failed send must not roll the account back —
      // the verify page offers "Resend email" for exactly this.
      await sendEmailVerification(user).catch(() => {});

      // The Firebase session stays: the verify page re-reads it to see whether
      // the address is confirmed yet, then signs out on the way to /login.
      router.push(nextHref(email));
    } catch (cause) {
      if (mode === "selfhost") {
        setError("Could not create your account. Try again.");
      } else {
        const { authErrorMessage } = await import("@/lib/firebase/client");
        setError(authErrorMessage(cause, "Could not create your account."));
      }
    } finally {
      setPending(false);
    }
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
          className={inputClass}
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
          className={inputClass}
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
          className={inputClass}
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
