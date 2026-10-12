"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { PlusIcon } from "@/components/layout/icons";
import { CreateProjectForm } from "./CreateProjectForm";
import { ImportCsvForm } from "./ImportCsvForm";

/** The projects page toolbar: create and import, each in its own dialog. */
export function ProjectsToolbar() {
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setNewOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-[transform,opacity] duration-150 hover:opacity-90 motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
      >
        <PlusIcon className="h-4 w-4" />
        New project
      </button>
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className="rounded-md border border-edge px-4 py-2 text-sm text-muted transition-colors hover:bg-accent/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Import from CSV
      </button>

      <Dialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New project"
        description="Give it a name and a rough span; you can add milestones and tasks next."
      >
        <CreateProjectForm onSuccess={() => setNewOpen(false)} />
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import a GanttProject CSV"
        description="Groups become milestones; tasks keep their order."
      >
        <ImportCsvForm onSuccess={() => setImportOpen(false)} />
      </Dialog>
    </div>
  );
}
