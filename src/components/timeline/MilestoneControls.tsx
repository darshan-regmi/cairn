"use client";

import { useId, useState, useTransition } from "react";
import {
  moveMilestoneAction,
  rescheduleMilestoneAction,
} from "@/actions/projects";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

const arrowClass =
  "rounded-md border border-edge px-2 py-1 text-sm leading-none transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

/** Move a milestone one place up or down the timeline. */
export function MoveMilestoneButtons({
  milestoneId,
  isFirst,
  isLast,
}: {
  milestoneId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <form action={moveMilestoneAction} className="inline-flex">
        <input type="hidden" name="milestoneId" value={milestoneId} />
        <input type="hidden" name="direction" value="up" />
        <button
          type="submit"
          disabled={isFirst}
          aria-label="Move milestone up"
          title="Move up"
          className={arrowClass}
        >
          ↑
        </button>
      </form>
      <form action={moveMilestoneAction} className="inline-flex">
        <input type="hidden" name="milestoneId" value={milestoneId} />
        <input type="hidden" name="direction" value="down" />
        <button
          type="submit"
          disabled={isLast}
          aria-label="Move milestone down"
          title="Move down"
          className={arrowClass}
        >
          ↓
        </button>
      </form>
    </div>
  );
}

/** Inline form to change a milestone's planned dates. */
export function RescheduleMilestonePanel({
  milestoneId,
  plannedStart,
  plannedEnd,
}: {
  milestoneId: string;
  plannedStart: string;
  plannedEnd: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await rescheduleMilestoneAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        setOpen(false);
      } else {
        setError(result.error ?? "Could not reschedule the milestone.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded px-1 text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Reschedule
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-3 w-full rounded-lg border border-edge bg-accent/5 p-4"
    >
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label
            htmlFor={`${uid}-start`}
            className="block text-xs font-medium text-muted"
          >
            Start
          </label>
          <input
            id={`${uid}-start`}
            name="plannedStart"
            type="date"
            required
            defaultValue={plannedStart}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`${uid}-end`}
            className="block text-xs font-medium text-muted"
          >
            End
          </label>
          <input
            id={`${uid}-end`}
            name="plannedEnd"
            type="date"
            required
            defaultValue={plannedEnd}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          {pending ? "Saving…" : "Save dates"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(false);
          }}
          className="rounded-md border border-edge px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}
