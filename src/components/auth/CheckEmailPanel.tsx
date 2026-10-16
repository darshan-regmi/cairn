"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const buttonClass =
  "w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink";

const secondaryButtonClass =
  "w-full rounded-md border border-edge px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * Cloud mode. Firebase hosts the verification link, so this panel is how the
 * browser that just signed up comes back, re-reads the account and moves on to
 * the login page once the address is confirmed. The Firebase session is left
 * intact for that; the page signs it out on the way to /login.
 */
export function CheckEmailPanel({
  email,
  callbackUrl,
}: {
  email?: string;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<"check" | "resend" | null>(null);

  const loginHref = callbackUrl
    ? `/login?verified=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login?verified=1";

  async function onCheck() {
    setError(null);
    setNotice(null);
    setPending("check");

    try {
      const [{ signOut }, { getFirebaseAuth }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/client"),
      ]);
      const firebaseAuth = getFirebaseAuth();
      const user = firebaseAuth.currentUser;

      if (!user) {
        setError("Your session expired. Log in with your email and password.");
        return;
      }

      await user.reload();
      if (!user.emailVerified) {
        setError(
          "Not verified yet — open the link in your inbox, then try again.",
        );
        return;
      }

      await signOut(firebaseAuth);
      router.replace(loginHref);
    } catch (cause) {
      const { authErrorMessage } = await import("@/lib/firebase/client");
      setError(
        authErrorMessage(cause, "Could not check your verification. Try again."),
      );
    } finally {
      setPending(null);
    }
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    setPending("resend");

    try {
      const [{ sendEmailVerification }, { getFirebaseAuth }] =
        await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase/client"),
        ]);
      const user = getFirebaseAuth().currentUser;

      if (!user) {
        setError("Your session expired. Log in to request a new link.");
        return;
      }

      await sendEmailVerification(user);
      setNotice("Sent. Check your inbox again.");
    } catch (cause) {
      const { authErrorMessage } = await import("@/lib/firebase/client");
      setError(authErrorMessage(cause, "Could not send the email. Try again."));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {email
          ? `We sent a verification link to ${email}. Open it, then come back to this page.`
          : "We sent you a verification link. Open it, then come back to this page."}
      </p>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      {notice && (
        <p className="rounded-md border border-edge bg-accent/10 px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}

      <button
        type="button"
        onClick={onCheck}
        disabled={pending !== null}
        className={buttonClass}
      >
        {pending === "check" ? "Checking…" : "Verify email"}
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={pending !== null}
        className={secondaryButtonClass}
      >
        {pending === "resend" ? "Sending…" : "Resend email"}
      </button>

      <Link
        href={loginHref}
        className="block rounded text-center text-sm text-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to log in
      </Link>
    </div>
  );
}
