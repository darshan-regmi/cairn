"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeProjectAction,
  deleteProjectAction,
  reopenProjectAction,
} from "@/actions/projects";

const outlinedButton =
  "rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

const dangerButton =
  "rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 dark:border-red-900 dark:text-red-400";

function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Completing a project is the archive step, but it is reversible (reopen), so
 * it needs no confirmation — just a clear label.
 */
export function CompleteProjectButton({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  return (
    <form action={completeProjectAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton
        label="Mark complete"
        pendingLabel="Completing…"
        className={className ?? outlinedButton}
      />
    </form>
  );
}

/** Reopen a completed project so it returns to the dashboard. */
export function ReopenProjectButton({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  return (
    <form action={reopenProjectAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton
        label="Reopen project"
        pendingLabel="Reopening…"
        className={className ?? outlinedButton}
      />
    </form>
  );
}

/**
 * Deleting is permanent, so it takes two deliberate clicks: the first asks,
 * the second does it. Nothing is deleted until the confirm is submitted.
 */
export function DeleteProjectButton({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={className ?? dangerButton}
      >
        Delete project
      </button>
    );
  }

  return (
    <form action={deleteProjectAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton
        label="Yes, delete permanently"
        pendingLabel="Deleting…"
        className={dangerButton}
      />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded px-1 text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Cancel
      </button>
    </form>
  );
}
