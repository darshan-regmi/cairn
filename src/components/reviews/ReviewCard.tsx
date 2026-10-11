import { StatusBadge } from "@/components/StatusBadge";
import {
  reviewVerdictLabel,
  reviewVerdictTone,
  type ReviewVerdict,
} from "@/lib/status";

export type ReviewCardData = {
  date: string;
  verdict: ReviewVerdict;
  askedFor: string | null;
  demonstrated: string | null;
  promised: string | null;
};

/** Read-only summary of one milestone's review. Shared by both project views. */
export function ReviewCard({ review }: { review: ReviewCardData }) {
  return (
    <div className="rounded-lg border border-edge p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          label={reviewVerdictLabel[review.verdict]}
          tone={reviewVerdictTone[review.verdict]}
        />
        <span className="text-xs text-muted">{review.date}</span>
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {review.askedFor && (
          <div>
            <dt className="text-xs font-medium text-muted">Asked for</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">
              {review.askedFor}
            </dd>
          </div>
        )}
        {review.demonstrated && (
          <div>
            <dt className="text-xs font-medium text-muted">Demonstrated</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">
              {review.demonstrated}
            </dd>
          </div>
        )}
        {review.promised && (
          <div>
            <dt className="text-xs font-medium text-muted">Promised</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">
              {review.promised}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
