"use client";

import { updateMilestoneStatusAction } from "@/actions/projects";
import {
  MILESTONE_STATUSES,
  milestoneStatusLabel,
  type MilestoneStatus,
} from "@/lib/status";

/**
 * Compact status dropdown on the timeline. Submits itself on change so
 * marking a milestone done (or slipped) is one interaction.
 */
export function MilestoneStatusControl({
  milestoneId,
  status,
}: {
  milestoneId: string;
  status: MilestoneStatus;
}) {
  return (
    <form action={updateMilestoneStatusAction} className="inline-flex">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-label={`Status for milestone`}
        className="cursor-pointer rounded-md border border-edge bg-transparent px-2 py-1 text-xs text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
      >
        {MILESTONE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {milestoneStatusLabel[value]}
          </option>
        ))}
      </select>
    </form>
  );
}