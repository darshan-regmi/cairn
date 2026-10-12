"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMilestoneAction,
  moveMilestoneAction,
  updateMilestoneAction,
} from "@/actions/projects";
import { Dialog } from "@/components/ui/Dialog";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

const arrowClass =
  "rounded-md border border-edge px-2 py-1 text-sm leading-none transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

/** Move a milestone one place up or down the timeline. */
export function MoveMilestoneButtons({
  milestoneId,
  isFirst,
  isLast,
}: {
  milestoneId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <form action={moveMilestoneAction} className="inline-flex">
        <input type="hidden" name="milestoneId" value={milestoneId} />
        <input type="hidden" name="direction" value="up" />
        <button
          type="submit"
          disabled={isFirst}
          aria-label="Move milestone up"
          title="Move up"
          className={arrowClass}
        >
          ↑
        </button>
      </form>
      <form action={moveMilestoneAction} className="inline-flex">
        <input type="hidden" name="milestoneId" value={milestoneId} />
        <input type="hidden" name="direction" value="down" />
        <button
          type="submit"
          disabled={isLast}
          aria-label="Move milestone down"
          title="Move down"
          className={arrowClass}
        >
          ↓
        </button>
      </form>
    </div>
  );
}

/** Edit a milestone's name, goal and planned dates from a dialog. */
export function EditMilestoneDialog({
  milestoneId,
  name,
  goal,
  plannedStart,
  plannedEnd,
}: {
  milestoneId: string;
  name: string;
  goal: string;
  plannedStart: string;
  plannedEnd: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateMilestoneAction, {
    success: false,
  });
  const handled = useRef(false);
  const uid = useId();

  useEffect(() => {
    if (state.success && !handled.current) {
      handled.current = true;
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          handled.current = false;
          setOpen(true);
        }}
        className="rounded px-1 text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Edit
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit milestone"
        description="Rename it, restate the goal, or move the planned dates. Its tasks stay put."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="milestoneId" value={milestoneId} />

          <div className="space-y-1">
            <label
              htmlFor={`${uid}-name`}
              className="block text-sm font-medium"
            >
              Name
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              type="text"
              required
              maxLength={120}
              defaultValue={name}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`${uid}-goal`}
              className="block text-sm font-medium"
            >
              Goal <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id={`${uid}-goal`}
              name="goal"
              rows={2}
              maxLength={500}
              defaultValue={goal}
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="min-w-40 flex-1 space-y-1">
              <label
                htmlFor={`${uid}-start`}
                className="block text-sm font-medium"
              >
                Start
              </label>
              <input
                id={`${uid}-start`}
                name="plannedStart"
                type="date"
                required
                defaultValue={plannedStart}
                className={inputClass}
              />
            </div>
            <div className="min-w-40 flex-1 space-y-1">
              <label
                htmlFor={`${uid}-end`}
                className="block text-sm font-medium"
              >
                End
              </label>
              <input
                id={`${uid}-end`}
                name="plannedEnd"
                type="date"
                required
                defaultValue={plannedEnd}
                className={inputClass}
              />
            </div>
          </div>

          {state.error && (
            <p
              role="alert"
              className="border-l-2 border-red-500 pl-3 text-sm text-red-700 dark:text-red-400"
            >
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-edge px-3 py-1.5 text-sm transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-[transform,opacity] duration-150 hover:opacity-90 disabled:opacity-50 motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** Two-step delete: the first click asks, the second removes the milestone. */
export function DeleteMilestoneButton({
  milestoneId,
  milestoneName,
}: {
  milestoneId: string;
  milestoneName: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={deleteMilestoneAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <button
        type="submit"
        className="text-xs font-medium text-red-700 dark:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Delete “{milestoneName}”?
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded px-1 text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Cancel
      </button>
    </form>
  );
}
