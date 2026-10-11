"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  createMeetingAction,
  updateMeetingAction,
} from "@/actions/meetings";
import { toDateInput } from "@/lib/milestone-metrics";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export type MilestoneOption = { id: string; name: string };

export type MeetingFormValues = {
  id: string;
  date: string;
  nextMeetingDate: string;
  milestoneId: string;
  itemsDiscussed: string;
  achievements: string;
  problems: string;
};

type FieldsProps = {
  projectId: string;
  milestones: MilestoneOption[];
  meeting?: MeetingFormValues;
  onDone: () => void;
};

function MeetingFields({ projectId, milestones, meeting, onDone }: FieldsProps) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(meeting);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = meeting
        ? await updateMeetingAction({ success: false }, formData)
        : await createMeetingAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        if (!meeting) formRef.current?.reset();
        onDone();
      } else {
        setError(result.error ?? "Could not save the meeting.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="w-full rounded-lg border border-edge bg-accent/5 p-4 text-left"
    >
      <input type="hidden" name="projectId" value={projectId} />
      {meeting && <input type="hidden" name="meetingId" value={meeting.id} />}

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`${uid}-date`} className="block text-sm font-medium">
              Date
            </label>
            <input
              id={`${uid}-date`}
              name="date"
              type="date"
              required
              defaultValue={meeting?.date ?? toDateInput(new Date())}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${uid}-next`} className="block text-sm font-medium">
              Next meeting{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={`${uid}-next`}
              name="nextMeetingDate"
              type="date"
              defaultValue={meeting?.nextMeetingDate ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`${uid}-milestone`}
            className="block text-sm font-medium"
          >
            Milestone <span className="font-normal text-muted">(optional)</span>
          </label>
          <select
            id={`${uid}-milestone`}
            name="milestoneId"
            defaultValue={meeting?.milestoneId ?? ""}
            className={inputClass}
          >
            <option value="">No milestone</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor={`${uid}-items`} className="block text-sm font-medium">
            Items discussed
          </label>
          <textarea
            id={`${uid}-items`}
            name="itemsDiscussed"
            rows={3}
            maxLength={4000}
            defaultValue={meeting?.itemsDiscussed ?? ""}
            placeholder="What did you go through?"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${uid}-achievements`} className="block text-sm font-medium">
            What went well <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={`${uid}-achievements`}
            name="achievements"
            rows={2}
            maxLength={4000}
            defaultValue={meeting?.achievements ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${uid}-problems`} className="block text-sm font-medium">
            Problems <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={`${uid}-problems`}
            name="problems"
            rows={2}
            maxLength={4000}
            defaultValue={meeting?.problems ?? ""}
            className={inputClass}
          />
        </div>

        {!meeting && (
          <div className="space-y-1">
            <label htmlFor={`${uid}-actions`} className="block text-sm font-medium">
              Agreed actions{" "}
              <span className="font-normal text-muted">(one per line)</span>
            </label>
            <textarea
              id={`${uid}-actions`}
              name="actionItems"
              rows={3}
              maxLength={8000}
              placeholder={"Draft the literature review\nBook the lab for testing"}
              className={inputClass}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Log meeting"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-md border border-edge px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

export function AddMeetingPanel({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: MilestoneOption[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        + Log meeting
      </button>
    );
  }

  return (
    <MeetingFields
      projectId={projectId}
      milestones={milestones}
      onDone={() => setOpen(false)}
    />
  );
}

export function EditMeetingPanel({
  projectId,
  milestones,
  meeting,
}: {
  projectId: string;
  milestones: MilestoneOption[];
  meeting: MeetingFormValues;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded px-1 text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="w-full">
      <MeetingFields
        projectId={projectId}
        milestones={milestones}
        meeting={meeting}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}
