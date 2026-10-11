"use client";

import { useActionState } from "react";
import { acceptInviteAction, type InviteActionState } from "@/actions/invites";

const initialState: InviteActionState = { success: false };

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        {pending ? "Accepting…" : "Accept invitation"}
      </button>
      <p className="text-center text-xs text-muted">
        Accepting adds you as a supervisor on this project: read-only access
        plus commenting.
      </p>
      {state.error && (
        <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}