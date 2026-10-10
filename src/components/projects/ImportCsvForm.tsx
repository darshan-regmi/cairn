"use client";

import { useActionState, useState } from "react";
import { importProjectAction, type ProjectActionState } from "@/actions/projects";

const initialState: ProjectActionState = { success: false };

export function ImportCsvForm() {
  const [state, formAction, pending] = useActionState(
    importProjectAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-muted underline decoration-edge underline-offset-4 transition-colors hover:text-fg"
        >
          …or import a plan from a GanttProject CSV
        </button>
      ) : (
        <form
          action={formAction}
          className="rounded-lg border border-edge bg-accent/5 p-5"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-56 flex-1 space-y-1">
              <label htmlFor="import-file" className="block text-sm font-medium">
                Project CSV
              </label>
              <input
                id="import-file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent file:transition-colors hover:file:bg-accent/15"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            >
              {pending ? "Importing…" : "Import file"}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">
            Takes the outline, title, start/end dates, predecessors and notes
            columns from a GanttProject CSV export. Groups become milestones and
            tasks keep their order, dependencies first. One project per file.
          </p>
          {state.error && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-600 dark:text-red-400"
            >
              {state.error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}