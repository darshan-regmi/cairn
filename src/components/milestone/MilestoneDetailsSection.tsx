"use client";

import { useId, useState, useTransition } from "react";
import { saveMilestoneDetailsAction } from "@/actions/projects";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

/**
 * The owner's scope / definition-of-done panel on the milestone board. Shown
 * read-only until Edit is opened; both fields are optional and either can be
 * blank.
 */
export function MilestoneDetailsSection({
  milestoneId,
  scope,
  definitionOfDone,
}: {
  milestoneId: string;
  scope: string | null;
  definitionOfDone: string | null;
}) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveMilestoneDetailsAction(
        { success: false },
        formData,
      );
      if (result.success) {
        setError(null);
        setEditing(false);
      } else {
        setError(result.error ?? "Could not save the milestone details.");
      }
    });
  }

  const hasDetails = Boolean(scope || definitionOfDone);

  return (
    <section className="mt-8 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Scope &amp; definition of done</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {hasDetails ? "Edit" : "+ Add"}
          </button>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-3 w-full rounded-lg border border-edge bg-accent/5 p-4"
        >
          <input type="hidden" name="milestoneId" value={milestoneId} />
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor={`${uid}-scope`} className="block text-sm font-medium">
                Scope
              </label>
              <textarea
                id={`${uid}-scope`}
                name="scope"
                rows={2}
                maxLength={4000}
                defaultValue={scope ?? ""}
                placeholder="What is in this milestone — and what is not."
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${uid}-dod`} className="block text-sm font-medium">
                Definition of done
              </label>
              <textarea
                id={`${uid}-dod`}
                name="definitionOfDone"
                rows={2}
                maxLength={4000}
                defaultValue={definitionOfDone ?? ""}
                placeholder="How you will know it is finished."
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
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditing(false);
                }}
                className="rounded-md border border-edge px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : hasDetails ? (
        <div className="mt-3 space-y-3 rounded-lg border border-edge p-4">
          {scope && <Block label="Scope" value={scope} />}
          {definitionOfDone && (
            <Block label="Definition of done" value={definitionOfDone} />
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Note what is in scope and how you will know it is finished.
        </p>
      )}
    </section>
  );
}
