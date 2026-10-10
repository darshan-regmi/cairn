"use client";

import { useActionState } from "react";
import { createProjectAction, type ProjectActionState } from "@/actions/projects";
import { toDateInput } from "@/lib/milestone-metrics";

const initialState: ProjectActionState = { success: false };

function defaultDates() {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 6);
  return { start: toDateInput(start), end: toDateInput(end) };
}

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function CreateProjectForm() {
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    initialState,
  );
  const defaults = defaultDates();

  return (
    <form
      action={formAction}
      className="mt-8 rounded-lg border border-edge bg-accent/5 p-5"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1 space-y-1">
          <label htmlFor="project-title" className="block text-sm font-medium">
            New project
          </label>
          <input
            id="project-title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Distributed voting system"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="project-start" className="block text-sm font-medium">
            Start
          </label>
          <input
            id="project-start"
            name="startDate"
            type="date"
            required
            defaultValue={defaults.start}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="project-end" className="block text-sm font-medium">
            End
          </label>
          <input
            id="project-end"
            name="endDate"
            type="date"
            required
            defaultValue={defaults.end}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-[transform,opacity] duration-150 hover:opacity-90 disabled:opacity-50 motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
      {state.error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}