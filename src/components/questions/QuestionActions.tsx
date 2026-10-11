"use client";

import { useState, useTransition } from "react";
import {
  adoptQuestionAction,
  setQuestionStatusAction,
} from "@/actions/questions";
import {
  QUESTION_STATUSES,
  questionStatusLabel,
  type QuestionStatus,
} from "@/lib/status";
import type { MilestoneOption } from "@/components/questions/QuestionForm";

const inputClass =
  "rounded-md border border-edge bg-transparent px-2 py-1 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Compact status dropdown. Submits itself on change, matching the milestone
 * control: deciding to park or drop a question is one interaction.
 */
export function QuestionStatusControl({
  questionId,
  status,
}: {
  questionId: string;
  status: QuestionStatus;
}) {
  return (
    <form action={setQuestionStatusAction} className="inline-flex">
      <input type="hidden" name="questionId" value={questionId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-label="Status for question"
        className={`cursor-pointer ${inputClass}`}
      >
        {QUESTION_STATUSES.map((value) => (
          <option key={value} value={value}>
            {questionStatusLabel[value]}
          </option>
        ))}
      </select>
    </form>
  );
}

/** Adopt a question as a kanban card, recording the decision alongside it. */
export function AdoptQuestionForm({
  questionId,
  milestones,
  defaultMilestoneId,
}: {
  questionId: string;
  milestones: MilestoneOption[];
  defaultMilestoneId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await adoptQuestionAction({ success: false }, formData);
      if (result.success) {
        setError(null);
      } else {
        setError(result.error ?? "Could not adopt the question.");
      }
    });
  }

  if (milestones.length === 0) {
    return (
      <span className="text-xs text-muted">
        Add a milestone to adopt questions as tasks.
      </span>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full flex-wrap items-end gap-2"
    >
      <input type="hidden" name="questionId" value={questionId} />
      {!defaultMilestoneId && (
        <div className="space-y-1">
          <label
            htmlFor={`adopt-milestone-${questionId}`}
            className="block text-xs text-muted"
          >
            Milestone
          </label>
          <select
            id={`adopt-milestone-${questionId}`}
            name="milestoneId"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="">Pick one…</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {defaultMilestoneId && (
        <input type="hidden" name="milestoneId" value={defaultMilestoneId} />
      )}
      <div className="min-w-[12rem] flex-1 space-y-1">
        <label
          htmlFor={`decision-${questionId}`}
          className="block text-xs text-muted"
        >
          Decision <span className="font-normal">(optional)</span>
        </label>
        <input
          id={`decision-${questionId}`}
          name="decision"
          type="text"
          maxLength={2000}
          placeholder="Why we're doing it"
          className={`${inputClass} w-full`}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-edge px-3 py-1.5 text-sm transition-colors hover:bg-accent/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {pending ? "Adding…" : "Adopt as task"}
      </button>
      {error && (
        <p className="w-full text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}
