"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  importProjectAction,
  type ProjectActionState,
} from "@/actions/projects";

const initialState: ProjectActionState = { success: false };

/**
 * Import a project from a GanttProject CSV. Like the create form this
 * navigates on success rather than relying on a server redirect, so it is safe
 * to render inside a dialog.
 */
export function ImportCsvForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    importProjectAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!state.success || !state.projectId) return;
    if (handled.current === state.projectId) return;
    handled.current = state.projectId;
    formRef.current?.reset();
    onSuccess?.();
    router.push(`/projects/${state.projectId}`);
    router.refresh();
  }, [state, onSuccess, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="import-file" className="block text-sm font-medium">
          Project CSV
        </label>
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent file:transition-colors hover:file:bg-accent/15"
        />
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Reads the outline, title, dates, predecessors and notes columns of a
        GanttProject CSV export. Groups become milestones; tasks keep their
        order. Dates as YYYY-MM-DD, one project per file.
      </p>

      {state.error && (
        <p
          role="alert"
          className="border-l-2 border-red-500 pl-3 text-sm leading-relaxed text-red-700 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-[transform,opacity] duration-150 hover:opacity-90 disabled:opacity-50 motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          {pending ? "Importing…" : "Import file"}
        </button>
      </div>
    </form>
  );
}
