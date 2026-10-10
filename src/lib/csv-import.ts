import { parse } from "csv-parse/sync";

/**
 * CSV project import (GanttProject-style exports).
 *
 * The outline column `i` carries the hierarchy: a depth-1 row is the
 * project, depth-2 rows are groups/milestones and depth-3 rows are tasks
 * (this matches the app's project -> milestone -> task model; deeper or
 * inconsistent nesting is rejected with a row-scoped error).
 *
 * Only the columns the user selected are read, resolved by header name:
 * `i`, `Name/Title`, `Start Date`, `End Date`, `Predecessors`, `Notes`.
 * Everything else in the export (hours, resources, colours...) is ignored.
 */

export interface ParsedTask {
  title: string;
  due: string; // YYYY-MM-DD, from the CSV End Date
  notes: string | null;
}

export interface ParsedMilestone {
  name: string;
  plannedStart: string;
  plannedEnd: string;
  goal: string | null;
  tasks: ParsedTask[];
}

export interface ParsedProject {
  title: string;
  startDate: string;
  endDate: string;
  goal: string | null;
  milestones: ParsedMilestone[];
}

export type CsvImportResult =
  | { ok: true; project: ParsedProject }
  | { ok: false; error: string };

/** Row-scoped errors are surfaced as a single human-readable message. */
export class CsvImportError extends Error {}

const MAX_TITLE_LENGTH = 120;
const MAX_GOAL_LENGTH = 500;
const MAX_NOTES_LENGTH = 1000;
const MAX_ROWS = 2000;
const MAX_BYTES = 2_000_000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^\d+(\.\d+)*$/;

const REQUIRED_HEADERS = ["i", "name/title", "start date", "end date"] as const;

interface TaskOut extends ParsedTask {
  id: string; // outline id, e.g. "1.1.3"
  line: number; // CSV line for row-scoped errors
  predIds: string[]; // referenced predecessor outline ids
  predNames: string[]; // human-readable names for the "Depends on:" note
}

interface MilestoneOut extends Omit<ParsedMilestone, "tasks"> {
  tasks: TaskOut[];
}

function err(message: string): never {
  throw new CsvImportError(message);
}

export function parseProjectCsv(text: string): CsvImportResult {
  try {
    if (text.length > MAX_BYTES) throw err("File is too large (limit 2 MB).");

    let rows: string[][];
    try {
      rows = parse(text, {
        bom: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      });
    } catch {
      throw err("Could not read the CSV. Is it valid comma-separated text?");
    }

    if (rows.length === 0) throw err("The file is empty.");

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const indexOf = (name: string) => header.indexOf(name);
    for (const name of REQUIRED_HEADERS) {
      if (indexOf(name) === -1) {
        throw err(`Missing required column "${name}".`);
      }
    }
    const idx = {
      i: indexOf("i"),
      name: indexOf("name/title"),
      start: indexOf("start date"),
      end: indexOf("end date"),
      preds: indexOf("predecessors"),
      notes: indexOf("notes"),
    };

    if (rows.length - 1 > MAX_ROWS) {
      throw err(`Too many rows (limit ${MAX_ROWS}).`);
    }

    const seen = new Map<string, { line: number; name: string; depth: number }>();
    let project: Omit<ParsedProject, "milestones"> | null = null;
    let activeDepthTwo: { id: string; line: number } | null = null;
    const milestones: MilestoneOut[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const line = r + 1; // 1-based; the header row is line 1
      const cell = (i: number) => row[i] ?? "";
      const id = cell(idx.i).trim();
      const name = cell(idx.name).trim();

      if (!id && !name) continue; // stray blank row

      if (!id) throw err(`Row ${line}: missing id.`);
      if (!ID_RE.test(id)) {
        throw err(`Row ${line}: id "${id}" is not a valid outline id.`);
      }
      if (seen.has(id)) throw err(`Row ${line}: duplicate id "${id}".`);
      if (!name) throw err(`Row ${line}: missing title.`);
      if (name.length > MAX_TITLE_LENGTH) {
        throw err(`Row ${line}: title is longer than ${MAX_TITLE_LENGTH} characters.`);
      }

      const depth = id.split(".").length;
      const start = cell(idx.start).trim();
      const end = cell(idx.end).trim();
      if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
        throw err(`Row ${line}: expected dates as YYYY-MM-DD, got "${start}" -> "${end}".`);
      }
      if (end < start) {
        throw err(`Row ${line}: end date ${end} is before start date ${start}.`);
      }

      const notes = idx.notes >= 0 ? (cell(idx.notes) ?? "").trim() : "";

      switch (depth) {
        case 1: {
          if (project) throw err(`Row ${line}: only one project per file is supported.`);
          if (notes.length > MAX_GOAL_LENGTH) {
            throw err(`Row ${line}: project notes are longer than ${MAX_GOAL_LENGTH} characters.`);
          }
          project = { title: name, startDate: start, endDate: end, goal: notes || null };
          seen.set(id, { line, name, depth });
          activeDepthTwo = null;
          break;
        }
        case 2: {
          const parent = seen.get(id.slice(0, id.lastIndexOf(".")));
          if (!parent) throw err(`Row ${line}: project row must come before groups.`);
          if (parent.depth !== 1) {
            throw err(`Row ${line}: groups cannot be nested inside other groups.`);
          }
          if (notes.length > MAX_GOAL_LENGTH) {
            throw err(`Row ${line}: group notes are longer than ${MAX_GOAL_LENGTH} characters.`);
          }
          milestones.push({
            name,
            plannedStart: start,
            plannedEnd: end,
            goal: notes || null,
            tasks: [],
          });
          activeDepthTwo = { id, line };
          seen.set(id, { line, name, depth });
          break;
        }
        case 3: {
          const parent = seen.get(id.slice(0, id.lastIndexOf(".")));
          const insideGroup = activeDepthTwo && parent?.depth === 2;
          if (!insideGroup || !parent) {
            throw err(`Row ${line}: task "${name}" has no parent group.`);
          }
          if (notes.length > MAX_NOTES_LENGTH) {
            throw err(`Row ${line}: notes are longer than ${MAX_NOTES_LENGTH} characters.`);
          }
          const predIds = (idx.preds >= 0 ? (cell(idx.preds) || "") : "")
            .split(/[;,]/)
            .map((p) => p.trim())
            .filter(Boolean);

          const milestone = milestones[milestones.length - 1];
          milestone.tasks.push({
            id,
            line,
            title: name,
            due: end,
            notes: notes || null,
            predIds,
            predNames: [],
          });
          seen.set(id, { line, name, depth });
          break;
        }
        default:
          throw err(`Row ${line}: only three levels (project, group, task) are supported.`);
      }
    }

    if (!project) throw err('No project row found (an outline id at depth one, e.g. "1").');

    // Second pass: resolve predecessor names now that every row is known
    // (a predecessor may appear later in the file than its dependent), then
    // compose "Depends on: ..." notes and order tasks by dependency.
    for (const milestone of milestones) {
      for (const task of milestone.tasks) {
        if (task.predIds.length > 0) {
          task.predNames = task.predIds.map((p) => {
            const ref = seen.get(p);
            if (!ref) throw err(`Row ${task.line}: unknown predecessor "${p}".`);
            return ref.name;
          });
          const depNote = `Depends on: ${task.predNames.join(", ")}`;
          task.notes = task.notes ? `${task.notes}\n${depNote}` : depNote;
        }
      }
      milestone.tasks = orderTasks(milestone.tasks);
    }

    return {
      ok: true,
      project: {
        ...project,
        milestones: milestones.map((m) => ({
          name: m.name,
          plannedStart: m.plannedStart,
          plannedEnd: m.plannedEnd,
          goal: m.goal,
          tasks: m.tasks.map(({ title, due, notes }) => ({ title, due, notes })),
        })),
      },
    };
  } catch (e) {
    if (e instanceof CsvImportError) return { ok: false, error: e.message };
    return { ok: false, error: "Unexpected error while parsing the file." };
  }
}

/**
 * Stable topological order: a task with predecessors is listed after its
 * predecessors within the same milestone (cross-milestone references do not
 * affect order). Ties keep the original CSV row order. A cycle falls back to
 * row order instead of dropping data.
 */
function orderTasks(tasks: TaskOut[]): TaskOut[] {
  if (tasks.length < 2) return tasks;

  const byId = new Map(tasks.map((t, i) => [t.id, i] as const));
  const indegree = new Array(tasks.length).fill(0);
  const dependents = new Map<number, number[]>();
  for (let i = 0; i < tasks.length; i++) {
    for (const predId of tasks[i].predIds) {
      const p = byId.get(predId);
      if (p === undefined) continue; // is a group, project, or another milestone
      indegree[i]++;
      const list = dependents.get(p) ?? [];
      list.push(i);
      dependents.set(p, list);
    }
  }

  const remaining = new Set(Array.from({ length: tasks.length }, (_, i) => i));
  const order: number[] = [];
  while (remaining.size > 0) {
    let next = -1;
    for (const i of remaining) {
      if (indegree[i] === 0 && (next === -1 || i < next)) next = i;
    }
    if (next === -1) next = Math.min(...remaining); // cycle: keep row order
    remaining.delete(next);
    order.push(next);
    for (const d of dependents.get(next) ?? []) indegree[d]--;
  }

  return order.map((i) => tasks[i]);
}