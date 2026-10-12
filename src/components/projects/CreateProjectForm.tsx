"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectAction,
  type ProjectActionState,
} from "@/actions/projects";
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

/**
 * Create a project. On success the action returns the new id and we navigate
 * ourselves, so the form also works from a dialog (a server redirect would
 * leave the layout — and the open dialog — in place).
 */
export function CreateProjectForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createProjectAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<string | null>(null);
  const uid = useId();
  const defaults = defaultDates();

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
        <label htmlFor={`${uid}-title`} className="block text-sm font-medium">
          Project name
        </label>
        <input
          id={`${uid}-title`}
          name="title"
          type="text"
          required
          maxLength={120}
          placeholder="e.g. Distributed voting system"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`${uid}-goal`} className="block text-sm font-medium">
          Goal <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${uid}-goal`}
          name="goal"
          rows={2}
          maxLength={500}
          placeholder="What does a successful project look like?"
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-40 flex-1 space-y-1">
          <label htmlFor={`${uid}-start`} className="block text-sm font-medium">
            Start
          </label>
          <input
            id={`${uid}-start`}
            name="startDate"
            type="date"
            required
            defaultValue={defaults.start}
            className={inputClass}
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <label htmlFor={`${uid}-end`} className="block text-sm font-medium">
            End
          </label>
          <input
            id={`${uid}-end`}
            name="endDate"
            type="date"
            required
            defaultValue={defaults.end}
            className={inputClass}
          />
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="border-l-2 border-red-500 pl-3 text-sm text-red-700 dark:text-red-400"
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
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
