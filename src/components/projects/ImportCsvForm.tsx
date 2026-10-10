"use client";

import { useActionState, useState } from "react";
import { importProjectAction, type ProjectActionState } from "@/actions/projects";

const initialState: ProjectActionState = { success: false };

/**
 * Secondary entry point under the create form. The control feels like a
 * pill (not bare text) and the reveal is anchored to its origin: the form
 * grows out of the button on a vertical spring-like ease, reversible by
 * clicking the same button — so exit mirrors entry. Motion is gated on
 * prefers-reduced-motion via the motion-safe: variant.
 */
export function ImportCsvForm() {
  const [state, formAction, pending] = useActionState(
    importProjectAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="import-csv-panel"
        className="rounded-full border border-edge px-3.5 py-1.5 text-sm text-muted transition-[border-color,color,transform] duration-150 hover:border-accent/40 hover:text-fg motion-safe:active:scale-[0.97]"
      >
        …or import a plan from a GanttProject CSV
      </button>

      <div
        id="import-csv-panel"
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] ease-out motion-safe:duration-300 ${
          open ? "opacity-100" : "invisible opacity-0"
        }`}
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0">
          <form
            action={formAction}
            className="mt-3 rounded-lg border border-edge bg-accent/5 p-5"
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
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent file:transition-colors hover:file:bg-accent/15"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-[transform,opacity] duration-150 hover:opacity-90 disabled:opacity-50 motion-safe:active:scale-[0.97]"
              >
                {pending ? "Importing…" : "Import file"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Reads the outline, title, dates, predecessors and notes columns of
              a GanttProject CSV export. Groups become milestones; tasks keep
              their order, dependencies first. Dates as YYYY-MM-DD, one project
              per file.
            </p>
            {state.error && (
              <p
                role="alert"
                className="mt-3 border-l-2 border-red-500 pl-3 text-sm leading-relaxed text-red-600 dark:text-red-400"
              >
                {state.error}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}