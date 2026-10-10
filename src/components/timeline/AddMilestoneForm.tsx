"use client";

import { useState, useTransition } from "react";
import { createMilestoneAction } from "@/actions/projects";
import { toDateInput } from "@/lib/milestone-metrics";

function defaultDates() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return { start: toDateInput(start), end: toDateInput(end) };
}

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function AddMilestoneForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const defaults = defaultDates();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createMilestoneAction({ success: false }, formData);
      if (result?.success) {
        event.currentTarget.reset();
        setError(null);
        setOpen(false);
      } else {
        setError(result?.error ?? "Could not add the milestone.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10"
      >
        + Add milestone
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-sm rounded-lg border border-edge bg-accent/5 p-4"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="milestone-name" className="block text-sm font-medium">
            Milestone name
          </label>
          <input
            id="milestone-name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. M1 – Project proposal"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="milestone-start" className="block text-sm font-medium">
              Start
            </label>
            <input
              id="milestone-start"
              name="plannedStart"
              type="date"
              required
              defaultValue={defaults.start}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="milestone-end" className="block text-sm font-medium">
              End
            </label>
            <input
              id="milestone-end"
              name="plannedEnd"
              type="date"
              required
              defaultValue={defaults.end}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="milestone-goal" className="block text-sm font-medium">
            Goal <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="milestone-goal"
            name="goal"
            rows={2}
            maxLength={500}
            placeholder="What does done look like?"
            className={inputClass}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add milestone"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-edge px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}