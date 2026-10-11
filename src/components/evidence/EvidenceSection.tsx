"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  createEvidenceAction,
  deleteEvidenceAction,
  updateEvidenceAction,
} from "@/actions/evidence";
import { EvidenceCard } from "@/components/evidence/EvidenceCard";
import {
  EVIDENCE_TYPES,
  evidenceTypeLabel,
  type EvidenceType,
} from "@/lib/status";
import { toDateInput } from "@/lib/milestone-metrics";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export type EvidenceItemData = {
  id: string;
  title: string;
  date: string;
  type: EvidenceType;
  url: string | null;
  whatItProves: string | null;
};

type FormValues = {
  id: string;
  title: string;
  date: string;
  type: EvidenceType;
  url: string;
  whatItProves: string;
};

function EvidenceFields({
  milestoneId,
  evidence,
  onDone,
}: {
  milestoneId: string;
  evidence?: FormValues;
  onDone: () => void;
}) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(evidence);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = evidence
        ? await updateEvidenceAction({ success: false }, formData)
        : await createEvidenceAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        if (!evidence) formRef.current?.reset();
        onDone();
      } else {
        setError(result.error ?? "Could not save the evidence.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="w-full rounded-lg border border-edge bg-accent/5 p-4"
    >
      <input type="hidden" name="milestoneId" value={milestoneId} />
      {evidence && <input type="hidden" name="evidenceId" value={evidence.id} />}

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor={`${uid}-title`} className="block text-sm font-medium">
            Title
          </label>
          <input
            id={`${uid}-title`}
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={evidence?.title ?? ""}
            placeholder="e.g. End-to-end upload demo"
            className={inputClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`${uid}-type`} className="block text-sm font-medium">
              Type
            </label>
            <select
              id={`${uid}-type`}
              name="type"
              defaultValue={evidence?.type ?? "DEMO"}
              className={inputClass}
            >
              {EVIDENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {evidenceTypeLabel[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`${uid}-date`} className="block text-sm font-medium">
              Date
            </label>
            <input
              id={`${uid}-date`}
              name="date"
              type="date"
              required
              defaultValue={evidence?.date ?? toDateInput(new Date())}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor={`${uid}-url`} className="block text-sm font-medium">
            Link <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${uid}-url`}
            name="url"
            type="url"
            maxLength={500}
            defaultValue={evidence?.url ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={`${uid}-proves`} className="block text-sm font-medium">
            What it proves{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={`${uid}-proves`}
            name="whatItProves"
            rows={2}
            maxLength={4000}
            defaultValue={evidence?.whatItProves ?? ""}
            placeholder="One line you could reuse in the report"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add evidence"}
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

/**
 * The owner's evidence panel on the milestone board: add, edit and delete the
 * links that prove the milestone. The read-only card is shared with the
 * supervisor view, so both draw the same thing.
 */
export function EvidenceSection({
  milestoneId,
  items,
}: {
  milestoneId: string;
  items: EvidenceItemData[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="mt-10 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Evidence</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            className="rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            + Add evidence
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        Links that prove this milestone: demos, screenshots, test results,
        benchmarks, commits.
      </p>

      {adding && (
        <div className="mt-3">
          <EvidenceFields
            milestoneId={milestoneId}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {items.length === 0 && !adding ? (
        <p className="mt-3 text-sm text-muted">
          No evidence yet. Collect links to real artefacts as you go; they become
          your report and viva material.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <EvidenceFields
                  milestoneId={milestoneId}
                  evidence={{
                    id: item.id,
                    title: item.title,
                    date: item.date,
                    type: item.type,
                    url: item.url ?? "",
                    whatItProves: item.whatItProves ?? "",
                  }}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <EvidenceCard
                  evidence={item}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(false);
                          setEditingId(item.id);
                        }}
                        className="rounded px-1 text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Edit
                      </button>
                      <form action={deleteEvidenceAction}>
                        <input
                          type="hidden"
                          name="evidenceId"
                          value={item.id}
                        />
                        <button
                          type="submit"
                          className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                        >
                          Delete
                        </button>
                      </form>
                    </>
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
