import type { ReactNode } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  evidenceTypeLabel,
  evidenceTypeTone,
  type EvidenceType,
} from "@/lib/status";

export type EvidenceCardData = {
  id: string;
  title: string;
  date: string;
  type: EvidenceType;
  url: string | null;
  whatItProves: string | null;
};

/**
 * Read-only summary of one piece of evidence. Shared by the milestone board
 * (which passes edit/delete controls in) and the supervisor's read-only view.
 */
export function EvidenceCard({
  evidence,
  actions,
}: {
  evidence: EvidenceCardData;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-edge p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={evidenceTypeLabel[evidence.type]}
            tone={evidenceTypeTone[evidence.type]}
          />
          <span className="font-medium">{evidence.title}</span>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      <p className="mt-1 text-xs text-muted">{evidence.date}</p>

      {evidence.url && (
        <p className="mt-2 text-sm">
          <a
            href={evidence.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {evidence.url}
          </a>
        </p>
      )}

      {evidence.whatItProves && (
        <p className="mt-2 whitespace-pre-wrap text-sm">
          {evidence.whatItProves}
        </p>
      )}
    </div>
  );
}
