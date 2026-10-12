"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProjectAction,
  type ProjectActionState,
} from "@/actions/projects";
import { Dialog } from "@/components/ui/Dialog";
import { toDateInput } from "@/lib/milestone-metrics";

const initialState: ProjectActionState = { success: false };

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/** Edit a project's name, goal and dates from a dialog. Owner only. */
export function EditProjectDialog({
  project,
}: {
  project: {
    id: string;
    title: string;
    goal: string | null;
    startDate: Date;
    endDate: Date;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateProjectAction,
    initialState,
  );
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
        className="rounded-md border border-edge px-3 py-1.5 text-sm text-fg transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Edit project
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit project"
        description="Rename it, sharpen the goal, or adjust the dates."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="projectId" value={project.id} />

          <div className="space-y-1">
            <label
              htmlFor={`${uid}-title`}
              className="block text-sm font-medium"
            >
              Project name
            </label>
            <input
              id={`${uid}-title`}
              name="title"
              type="text"
              required
              maxLength={120}
              defaultValue={project.title}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`${uid}-goal`} className="block text-sm font-medium">
              Goal <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id={`${uid}-goal`}
              name="goal"
              rows={2}
              maxLength={500}
              defaultValue={project.goal ?? ""}
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
                name="startDate"
                type="date"
                required
                defaultValue={toDateInput(project.startDate)}
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
                name="endDate"
                type="date"
                required
                defaultValue={toDateInput(project.endDate)}
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
