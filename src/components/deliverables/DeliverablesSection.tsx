"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  createDeliverableAction,
  deleteDeliverableAction,
  toggleDeliverableAction,
  updateDeliverableAction,
} from "@/actions/deliverables";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export type DeliverableItemData = {
  id: string;
  title: string;
  url: string | null;
  done: boolean;
};

type FormValues = {
  id: string;
  title: string;
  url: string;
};

function DeliverableFields({
  milestoneId,
  deliverable,
  onDone,
}: {
  milestoneId: string;
  deliverable?: FormValues;
  onDone: () => void;
}) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(deliverable);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = deliverable
        ? await updateDeliverableAction({ success: false }, formData)
        : await createDeliverableAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        if (!deliverable) formRef.current?.reset();
        onDone();
      } else {
        setError(result.error ?? "Could not save the deliverable.");
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
      {deliverable && (
        <input type="hidden" name="deliverableId" value={deliverable.id} />
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor={`${uid}-title`} className="block text-sm font-medium">
            Deliverable
          </label>
          <input
            id={`${uid}-title`}
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={deliverable?.title ?? ""}
            placeholder="e.g. Working upload page"
            className={inputClass}
          />
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
            defaultValue={deliverable?.url ?? ""}
            placeholder="https://…"
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
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add deliverable"}
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
 * The owner's deliverables checklist for a milestone. Each row can be ticked
 * off, renamed, or removed. A tick records doneAt on the server; the derived
 * count is shown so progress through the checklist is obvious.
 */
export function DeliverablesSection({
  milestoneId,
  items,
}: {
  milestoneId: string;
  items: DeliverableItemData[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className="mt-10 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Deliverables</h2>
          <p className="mt-1 text-sm text-muted">
            Concrete outputs this milestone produces. Tick them off as they land.
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            className="rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            + Add deliverable
          </button>
        )}
      </div>

      {items.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          {doneCount}/{items.length} done
        </p>
      )}

      {adding && (
        <div className="mt-3">
          <DeliverableFields
            milestoneId={milestoneId}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {items.length === 0 && !adding ? (
        <p className="mt-3 text-sm text-muted">
          No deliverables yet. Add the outputs this milestone has to produce.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <DeliverableFields
                  milestoneId={milestoneId}
                  deliverable={{
                    id: item.id,
                    title: item.title,
                    url: item.url ?? "",
                  }}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge p-3">
                  <div className="flex items-start gap-3">
                    <form action={toggleDeliverableAction} className="inline-flex">
                      <input
                        type="hidden"
                        name="deliverableId"
                        value={item.id}
                      />
                      <input
                        type="hidden"
                        name="done"
                        value={item.done ? "false" : "true"}
                      />
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(event) =>
                          event.currentTarget.form?.requestSubmit()
                        }
                        aria-label={`Mark ${item.title} as ${
                          item.done ? "not done" : "done"
                        }`}
                        className="mt-0.5 h-4 w-4 accent-indigo-600"
                      />
                    </form>
                    <div className="min-w-0">
                      <p
                        className={`text-sm ${
                          item.done ? "text-muted line-through" : "font-medium"
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block break-all text-xs text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {item.url}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                    <form action={deleteDeliverableAction}>
                      <input
                        type="hidden"
                        name="deliverableId"
                        value={item.id}
                      />
                      <button
                        type="submit"
                        className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
