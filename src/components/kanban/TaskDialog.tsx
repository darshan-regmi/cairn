"use client";

import { useEffect, useRef, useState } from "react";
import { useTransition } from "react";
import {
  deleteTaskAction,
  saveTaskAction,
  type TaskActionState,
} from "@/actions/tasks";
import {
  PRIORITIES,
  TASK_STATUSES,
  priorityLabel,
  taskStatusLabel,
  type Priority,
  type TaskStatus,
} from "@/lib/status";
import type { DialogState } from "./KanbanBoard";

const initialState: TaskActionState = { success: false };

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function TaskDialog({
  milestoneId,
  dialog,
  onClose,
}: {
  milestoneId: string;
  dialog: NonNullable<DialogState>;
  onClose: () => void;
}) {
  const editing = dialog.mode === "edit";
  const card = editing ? dialog.card : null;

  const titleRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Esc closes the dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveTaskAction(initialState, formData);
      if (result?.success) {
        onClose();
      } else {
        setError(result?.error ?? "Could not save the task.");
      }
    });
  }

  function handleDelete() {
    if (!card) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      window.setTimeout(() => setConfirmingDelete(false), 2500);
      return;
    }
    const formData = new FormData();
    formData.set("taskId", card.id);
    startTransition(async () => {
      const result = await deleteTaskAction(initialState, formData);
      if (result?.success) onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit task" : "Add task"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-edge bg-surface p-5 shadow-xl">
        <h2 className="text-lg font-semibold tracking-tight">
          {editing ? "Edit task" : "Add task"}
        </h2>

        <form onSubmit={handleSave} noValidate className="mt-4 space-y-4">
          <input type="hidden" name="milestoneId" value={milestoneId} />
          {card && <input type="hidden" name="taskId" value={card.id} />}

          <div className="space-y-1">
            <label htmlFor="task-title" className="block text-sm font-medium">
              Title
            </label>
            <input
              ref={titleRef}
              id="task-title"
              name="title"
              type="text"
              required
              maxLength={200}
              defaultValue={card?.title ?? ""}
              placeholder="What needs to happen?"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="task-status" className="block text-sm font-medium">
                Status
              </label>
              <select
                id="task-status"
                name="status"
                defaultValue={
                  card?.status ??
                  (dialog.mode === "create" ? dialog.status : "TODO")
                }
                className={inputClass}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {taskStatusLabel[status as TaskStatus]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="task-priority" className="block text-sm font-medium">
                Priority
              </label>
              <select
                id="task-priority"
                name="priority"
                defaultValue={card?.priority ?? ("MEDIUM" as Priority)}
                className={inputClass}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel[priority as Priority]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="task-due" className="block text-sm font-medium">
              Due date <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="task-due"
              name="due"
              type="date"
              defaultValue={card?.due ?? ""}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="task-commit" className="block text-sm font-medium">
              Commit <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="task-commit"
              name="commit"
              type="text"
              maxLength={100}
              defaultValue={card?.commit ?? ""}
              placeholder="e.g. a1b2c3d"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="task-notes" className="block text-sm font-medium">
              Notes <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="task-notes"
              name="notes"
              rows={3}
              maxLength={2000}
              defaultValue={card?.notes ?? ""}
              placeholder="Anything worth remembering"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div>
              {card && !confirmingDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-sm text-muted transition-colors hover:text-red-600"
                >
                  Delete task
                </button>
              )}
              {card && confirmingDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-sm font-medium text-red-600 dark:text-red-400"
                >
                  {pending ? "Deleting…" : "Really delete?"}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-edge px-3 py-1.5 text-sm transition-colors hover:bg-accent/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition-opacity disabled:opacity-50"
              >
                {pending ? "Saving…" : editing ? "Save changes" : "Add task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}