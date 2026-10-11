"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signUp, type SignUpState } from "@/actions/auth";

const initialState: SignUpState = { success: false };

export function SignUpForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(signUp, initialState);

  // After the account is created, sign the user straight in so they land on
  // the app without a second login round trip.
  useEffect(() => {
    if (!state.success) return;

    void signIn("credentials", {
      redirect: false,
      email: emailRef.current?.value ?? "",
      password: passwordRef.current?.value ?? "",
    }).then((result) => {
      if (result?.error) {
        router.push("/login?registered=1");
      } else {
        router.push(callbackUrl || "/projects");
        router.refresh();
      }
    });
  }, [state.success, router, callbackUrl]);

  return (
    <form action={formAction} className="space-y-4">
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
          ref={emailRef}
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
          ref={passwordRef}
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

      {state.error && (
        <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
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