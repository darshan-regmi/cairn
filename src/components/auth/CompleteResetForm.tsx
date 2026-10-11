"use client";

import { useActionState, useId } from "react";
import {
  completePasswordResetAction,
  type CompleteResetState,
} from "@/actions/reset";

const initialState: CompleteResetState = { success: false };

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/** Sets a new password from a valid reset token. */
export function CompleteResetForm({ token }: { token: string }) {
  const passwordId = useId();
  const confirmId = useId();
  const [state, formAction, pending] = useActionState(
    completePasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <label htmlFor={passwordId} className="block text-sm font-medium">
          New password
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <p className="text-xs text-muted">At least 8 characters.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor={confirmId} className="block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id={confirmId}
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
