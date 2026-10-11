"use client";

import { useFormStatus } from "react-dom";
import {
  archiveProjectAction,
  restoreProjectAction,
} from "@/actions/projects";

const outlinedButton =
  "rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? outlinedButton}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Archive is reversible, so it asks for confirmation before hiding the project
 * from the dashboard and pausing its share link.
 */
export function ArchiveProjectButton({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  return (
    <form
      action={archiveProjectAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Archive this project? It will be hidden from your dashboard and its share link will stop working. Nothing is deleted, and you can restore it at any time.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton label="Archive project" pendingLabel="Archiving…" className={className} />
    </form>
  );
}

/** Bring an archived project back to the dashboard. */
export function RestoreProjectButton({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  return (
    <form action={restoreProjectAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton label="Restore project" pendingLabel="Restoring…" className={className} />
    </form>
  );
}
