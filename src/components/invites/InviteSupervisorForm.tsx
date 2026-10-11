"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInviteAction } from "@/actions/invites";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Sends a supervisor invite for this project. Without SMTP the raw link is
 * the delivery mechanism, so the created link is shown once for the student
 * to copy and send themselves.
 */
export function InviteSupervisorForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createInviteAction({ success: false }, formData);
      if (result.success && result.inviteUrl) {
        setInviteUrl(`${window.location.origin}${result.inviteUrl}`);
        setError(null);
        form.reset();
        // Re-render the server page so the pending-invites list appears.
        router.refresh();
      } else {
        setInviteUrl(null);
        setError(result.error ?? "Could not create the invite.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-edge p-4">
      <h3 className="text-sm font-medium">Invite a supervisor</h3>
      {inviteUrl ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted">
            Send this link to your supervisor. It works for 7 days and grants
            read-only access plus commenting.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Invite link"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(inviteUrl);
              }}
              className="shrink-0 rounded-md border border-edge px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Copy
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-3 flex gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <label htmlFor="invite-email" className="sr-only">
            Supervisor email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="supervisor@example.com"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-md border border-edge px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {pending ? "Sending…" : "Create invite link"}
          </button>
        </form>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}