"use client";

import { useId, useState, useTransition } from "react";
import { saveReviewAction } from "@/actions/reviews";
import {
  REVIEW_VERDICTS,
  reviewVerdictLabel,
  type ReviewVerdict,
} from "@/lib/status";
import { toDateInput } from "@/lib/milestone-metrics";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export type ReviewFormValues = {
  date: string;
  verdict: ReviewVerdict;
  askedFor: string;
  demonstrated: string;
  promised: string;
};

/**
 * Record or edit the milestone's review. There is one review per milestone,
 * so saving is an upsert and the panel just toggles open/closed.
 */
export function ReviewFormPanel({
  milestoneId,
  review,
}: {
  milestoneId: string;
  review?: ReviewFormValues;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveReviewAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        setOpen(false);
      } else {
        setError(result.error ?? "Could not save the review.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {review ? "Edit review" : "+ Record review"}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full rounded-lg border border-edge bg-accent/5 p-4"
    >
      <input type="hidden" name="milestoneId" value={milestoneId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`${uid}-date`} className="block text-sm font-medium">
            Review date
          </label>
          <input
            id={`${uid}-date`}
            name="date"
            type="date"
            required
            defaultValue={review?.date ?? toDateInput(new Date())}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`${uid}-verdict`}
            className="block text-sm font-medium"
          >
            Verdict
          </label>
          <select
            id={`${uid}-verdict`}
            name="verdict"
            defaultValue={review?.verdict ?? "ON_TRACK"}
            className={inputClass}
          >
            {REVIEW_VERDICTS.map((verdict) => (
              <option key={verdict} value={verdict}>
                {reviewVerdictLabel[verdict]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <label htmlFor={`${uid}-asked`} className="block text-sm font-medium">
            Asked for
          </label>
          <textarea
            id={`${uid}-asked`}
            name="askedFor"
            rows={2}
            maxLength={4000}
            defaultValue={review?.askedFor ?? ""}
            placeholder="What the supervisor asked to see"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`${uid}-demonstrated`}
            className="block text-sm font-medium"
          >
            Demonstrated
          </label>
          <textarea
            id={`${uid}-demonstrated`}
            name="demonstrated"
            rows={2}
            maxLength={4000}
            defaultValue={review?.demonstrated ?? ""}
            placeholder="What you actually showed"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`${uid}-promised`}
            className="block text-sm font-medium"
          >
            Promised
          </label>
          <textarea
            id={`${uid}-promised`}
            name="promised"
            rows={2}
            maxLength={4000}
            defaultValue={review?.promised ?? ""}
            placeholder="What you agreed to bring next time"
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        >
          {pending ? "Saving…" : review ? "Save changes" : "Save review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-edge px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
