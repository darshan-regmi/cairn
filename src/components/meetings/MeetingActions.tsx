"use client";

import { useState, useTransition } from "react";
import {
  addMeetingTaskAction,
  convertMeetingTaskAction,
} from "@/actions/meetings";
import type { MilestoneOption } from "@/components/meetings/MeetingForm";

const inputClass =
  "rounded-md border border-edge bg-transparent px-2 py-1 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

const primaryButton =
  "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink";

const quietButton =
  "rounded-md border border-edge px-3 py-1.5 text-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Add one agreed action to an existing meeting. */
export function AddActionForm({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await addMeetingTaskAction({ success: false }, formData);
      if (result.success) {
        form.reset();
        setError(null);
        setOpen(false);
      } else {
        setError(result.error ?? "Could not add the action.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        + Add action
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-2 flex flex-wrap items-start gap-2"
    >
      <input type="hidden" name="meetingId" value={meetingId} />
      <input
        name="text"
        type="text"
        required
        maxLength={200}
        aria-label="New agreed action"
        placeholder="e.g. Draft the literature review"
        className={`${inputClass} min-w-0 flex-1`}
      />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className={quietButton}
      >
        Cancel
      </button>
      {error && (
        <p className="w-full text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}

/** Turn one agreed action into a kanban card on a milestone. */
export function ConvertActionForm({
  meetingTaskId,
  milestones,
  defaultMilestoneId,
}: {
  meetingTaskId: string;
  milestones: MilestoneOption[];
  defaultMilestoneId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await convertMeetingTaskAction({ success: false }, formData);
      if (result.success) {
        setError(null);
      } else {
        setError(result.error ?? "Could not convert the action.");
      }
    });
  }

  if (!defaultMilestoneId && milestones.length === 0) {
    return (
      <span className="text-xs text-muted">
        Add a milestone to convert actions into tasks.
      </span>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="meetingTaskId" value={meetingTaskId} />
      {defaultMilestoneId ? (
        <input type="hidden" name="milestoneId" value={defaultMilestoneId} />
      ) : (
        <select
          name="milestoneId"
          required
          defaultValue=""
          aria-label="Milestone for the new task"
          className={inputClass}
        >
          <option value="">Pick a milestone…</option>
          {milestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.name}
            </option>
          ))}
        </select>
      )}
      <button type="submit" disabled={pending} className={quietButton}>
        {pending ? "Adding…" : "Convert to task"}
      </button>
      {error && (
        <span className="text-xs text-red-700 dark:text-red-400">{error}</span>
      )}
    </form>
  );
}
