"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  createQuestionAction,
  updateQuestionAction,
} from "@/actions/questions";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export type MilestoneOption = { id: string; name: string };

export type QuestionFormValues = {
  id: string;
  title: string;
  milestoneId: string;
  context: string;
  ifWeDoIt: string;
  whatItCosts: string;
  ifWeDont: string;
};

type FieldsProps = {
  projectId: string;
  milestones: MilestoneOption[];
  question?: QuestionFormValues;
  onDone: () => void;
};

function QuestionFields({
  projectId,
  milestones,
  question,
  onDone,
}: FieldsProps) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(question);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = question
        ? await updateQuestionAction({ success: false }, formData)
        : await createQuestionAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        if (!question) formRef.current?.reset();
        onDone();
      } else {
        setError(result.error ?? "Could not save the question.");
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
      {question && <input type="hidden" name="questionId" value={question.id} />}

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor={`${uid}-title`} className="block text-sm font-medium">
            The question
          </label>
          <input
            id={`${uid}-title`}
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={question?.title ?? ""}
            placeholder="e.g. Do we need a native mobile app?"
            className={inputClass}
          />
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
            defaultValue={question?.milestoneId ?? ""}
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
          <label htmlFor={`${uid}-context`} className="block text-sm font-medium">
            Context <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={`${uid}-context`}
            name="context"
            rows={2}
            maxLength={4000}
            defaultValue={question?.context ?? ""}
            placeholder="Why does this matter?"
            className={inputClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label
              htmlFor={`${uid}-if-we-do-it`}
              className="block text-sm font-medium"
            >
              If we do it
            </label>
            <textarea
              id={`${uid}-if-we-do-it`}
              name="ifWeDoIt"
              rows={3}
              maxLength={4000}
              defaultValue={question?.ifWeDoIt ?? ""}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`${uid}-what-it-costs`}
              className="block text-sm font-medium"
            >
              What it costs
            </label>
            <textarea
              id={`${uid}-what-it-costs`}
              name="whatItCosts"
              rows={3}
              maxLength={4000}
              defaultValue={question?.whatItCosts ?? ""}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`${uid}-if-we-dont`}
              className="block text-sm font-medium"
            >
              If we don&rsquo;t
            </label>
            <textarea
              id={`${uid}-if-we-dont`}
              name="ifWeDont"
              rows={3}
              maxLength={4000}
              defaultValue={question?.ifWeDont ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Raise question"}
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

export function AddQuestionPanel({
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
        + Raise question
      </button>
    );
  }

  return (
    <QuestionFields
      projectId={projectId}
      milestones={milestones}
      onDone={() => setOpen(false)}
    />
  );
}

export function EditQuestionPanel({
  projectId,
  milestones,
  question,
}: {
  projectId: string;
  milestones: MilestoneOption[];
  question: QuestionFormValues;
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
      <QuestionFields
        projectId={projectId}
        milestones={milestones}
        question={question}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}
