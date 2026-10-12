"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signUp, type SignUpState } from "@/actions/auth";
import { USER_ROLES, userRoleBlurb, userRoleLabel } from "@/lib/roles";

const initialState: SignUpState = { success: false };

export function SignUpForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signUp, initialState);
  // A completed action resets the uncontrolled fields, so remember what was
  // submitted; the sign-in below runs after that reset.
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  // After the account is created, sign the user straight in so they land on
  // the app without a second login round trip.
  useEffect(() => {
    if (!state.success) return;

    void signIn("credentials", {
      redirect: false,
      email: credentials.email,
      password: credentials.password,
    }).then((result) => {
      if (result?.error) {
        router.push("/login?registered=1");
      } else {
        router.push(callbackUrl || "/dashboard");
        router.refresh();
      }
    });
  }, [state.success, router, callbackUrl, credentials]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        setCredentials({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        });
      }}
      className="space-y-4"
    >
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