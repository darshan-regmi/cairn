import { describe, expect, it } from "vitest";
import { parseProjectCsv } from "@/lib/csv-import";

const HEADER =
  'i,Name/Title,Type,"Start Date","End Date","Estimated Hours","Actual Hours","Percent Complete",Resources,Predecessors,Notes,URL,Comments,"Task Color"';

const SAMPLE = [
  HEADER,
  '1,"Meshly - FYP",project,2026-10-05,2026-12-27,313,0,0,Darshan,,"12-week plan matching proposal milestones M1 to M7.",,,',
  '1.1,"Phase 1 (M1): Foundation",group,2026-10-05,2026-10-18,45,0,0,Darshan,,"Server skeleton, auth, DB schema",,,',
  '1.1.1,"Finalise requirements and scope",task,2026-10-05,2026-10-06,4,0,0,Darshan,,"Lock the feature list from the proposal",,,blue2',
  '1.1.2,"Set up repo, Docker, GitHub Actions CI",task,2026-10-05,2026-10-07,6,0,0,Darshan,,"Commas, inside, notes",,,blue2',
  '1.1.3,"Design PostgreSQL schema",task,2026-10-07,2026-10-09,6,0,0,Darshan,1.1.2,"Users, nodes, chunks",,,blue2',
  '1.1.4,"Node.js + Express server skeleton",task,2026-10-08,2026-10-11,8,0,0,Darshan,"1.1.2; 1.1.1","Routes, config",,,blue2',
  '1.2,"Phase 2 (M2): Chunking",group,2026-10-19,2026-11-01,49,0,0,Darshan,,"Core pipeline: chunk, distribute, fetch",,,',
  '1.2.1,"Research chunking approaches",task,2026-10-19,2026-10-20,5,0,0,Darshan,1.1.4,"Compare Chord, IPFS, Dynamo ideas",,,blue2',
  '1.2.2,"Implement chunking algorithm",task,2026-10-21,2026-10-24,10,0,0,Darshan,1.2.1,"Split + encrypt",,,blue2',
].join("\n");

function expectOk(input: string) {
  const result = parseProjectCsv(input);
  if (!result.ok) {
    throw new Error(`Expected parse to succeed, got error: ${result.error}`);
  }
  return result.project;
}

describe("parseProjectCsv", () => {
  it("maps a GanttProject-style timeline to a project with milestones and tasks", () => {
    const project = expectOk(SAMPLE);

    expect(project.title).toBe("Meshly - FYP");
    expect(project.startDate).toBe("2026-10-05");
    expect(project.endDate).toBe("2026-12-27");
    expect(project.goal).toBe(
      "12-week plan matching proposal milestones M1 to M7.",
    );

    expect(project.milestones).toHaveLength(2);

    const [m1, m2] = project.milestones;
    expect(m1.name).toBe("Phase 1 (M1): Foundation");
    expect(m1.plannedStart).toBe("2026-10-05");
    expect(m1.plannedEnd).toBe("2026-10-18");
    expect(m1.goal).toBe("Server skeleton, auth, DB schema");
    expect(m1.tasks.map((t) => t.title)).toEqual([
      "Finalise requirements and scope",
      "Set up repo, Docker, GitHub Actions CI",
      "Design PostgreSQL schema",
      "Node.js + Express server skeleton",
    ]);

    expect(m2.name).toBe("Phase 2 (M2): Chunking");
    expect(m2.goal).toBe("Core pipeline: chunk, distribute, fetch");
    expect(m2.tasks.map((t) => t.title)).toEqual([
      "Research chunking approaches",
      "Implement chunking algorithm",
    ]);
  });

  it("keeps quoted commas inside fields and sets due from the end date", () => {
    const project = expectOk(SAMPLE);
    const setup = project.milestones[0].tasks[1];

    expect(setup.title).toBe("Set up repo, Docker, GitHub Actions CI");
    expect(setup.notes).toBe("Commas, inside, notes");
    expect(setup.due).toBe("2026-10-07");
  });

  it("composes a Depends on note for single and multi predecessors", () => {
    const project = expectOk(SAMPLE);
    const [m1] = project.milestones;

    const schema = m1.tasks[2]; // depends on 1.1.2
    expect(schema.notes).toBe(
      "Users, nodes, chunks\nDepends on: Set up repo, Docker, GitHub Actions CI",
    );

    const server = m1.tasks[3]; // "1.1.2; 1.1.1" -> listed order preserved
    expect(server.notes).toBe(
      "Routes, config\nDepends on: Set up repo, Docker, GitHub Actions CI, Finalise requirements and scope",
    );
  });

  it("resolves cross-milestone predecessors into the note without changing order", () => {
    const project = expectOk(SAMPLE);
    const research = project.milestones[1].tasks[0];
    expect(research.notes).toBe(
      "Compare Chord, IPFS, Dynamo ideas\nDepends on: Node.js + Express server skeleton",
    );
    expect(project.milestones[1].tasks.map((t) => t.title)).toEqual([
      "Research chunking approaches",
      "Implement chunking algorithm",
    ]);
  });

  it("orders tasks after their predecessors even when listed earlier", () => {
    const csv = [
      "i,Name/Title,Start Date,End Date,Predecessors,Notes",
      "1,Prj,2026-01-01,2026-03-01,,",
      "1.1,G1,2026-01-01,2026-02-01,,",
      '1.1.2,"Second (has dep)",2026-01-10,2026-01-20,1.1.1,',
      '1.1.1,"First",2026-01-05,2026-01-10,,',
    ].join("\n");

    const project = expectOk(csv);
    const tasks = project.milestones[0].tasks;
    expect(tasks.map((t) => t.title)).toEqual(["First", "Second (has dep)"]);
    expect(tasks[1].notes).toBe("Depends on: First");
  });

  it("tolerates a BOM and trailing blank rows", () => {
    expectOk("\uFEFF" + SAMPLE + "\n\n\n");
  });

  describe("errors", () => {
    const SHORT = "i,Name/Title,Start Date,End Date,Predecessors,Notes";
    const lines = (data: string[]) => [SHORT, ...data].join("\n");

    it("rejects an empty file", () => {
      expect(parseProjectCsv("")).toEqual({
        ok: false,
        error: "The file is empty.",
      });
      expect(parseProjectCsv("\n\n")).toEqual({
        ok: false,
        error: "The file is empty.",
      });
    });

    it("reports a missing required header", () => {
      const result = parseProjectCsv(
        "Name/Title,Start Date,End Date\n1,P,2026-01-01,2026-02-01\n",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('Missing required column "i".');
    });

    it("rejects a row without a title", () => {
      const result = parseProjectCsv(
        lines(['1,,2026-01-01,2026-02-01,,']),
      );
      expect(result).toEqual({ ok: false, error: "Row 2: missing title." });
    });

    it("rejects dates that are not YYYY-MM-DD", () => {
      const result = parseProjectCsv(
        lines(['1,P,05/10/2026,2026-02-01,,']),
      );
      if (!result.ok) {
        expect(result.error).toContain("expected dates as YYYY-MM-DD");
      } else {
        throw new Error("expected failure");
      }
    });

    it("rejects an end date before the start date", () => {
      const result = parseProjectCsv(
        lines(['1,P,2026-03-01,2026-02-01,,']),
      );
      if (!result.ok) {
        expect(result.error).toContain("end date 2026-02-01 is before start date");
      } else {
        throw new Error("expected failure");
      }
    });

    it("rejects an invalid outline id and duplicates", () => {
      const bad = parseProjectCsv(lines(['x,P,2026-01-01,2026-02-01,,']));
      if (!bad.ok) expect(bad.error).toContain("not a valid outline id");
      else throw new Error("expected failure");

      const dup = parseProjectCsv(
        lines([
          '1,P,2026-01-01,2026-02-01,,',
          '1,Q,2026-01-01,2026-02-01,,',
        ]),
      );
      expect(dup).toEqual({
        ok: false,
        error: "Row 3: duplicate id \"1\".",
      });
    });

    it("rejects a second project row", () => {
      const result = parseProjectCsv(
        lines([
          '1,P,2026-01-01,2026-02-01,,',
          '1.1,G,2026-01-01,2026-01-15,,',
          '2,Q,2026-02-01,2026-03-01,,',
        ]),
      );
      if (!result.ok) {
        expect(result.error).toContain("only one project per file");
      } else {
        throw new Error("expected failure");
      }
    });

    it("rejects groups before a project row", () => {
      const result = parseProjectCsv(
        lines(['1.1,G,2026-01-01,2026-01-15,,']),
      );
      if (!result.ok) {
        expect(result.error).toContain("project row must come before groups");
      } else {
        throw new Error("expected failure");
      }
    });

    it("rejects a task without a parent group", () => {
      const result = parseProjectCsv(
        lines([
          '1,P,2026-01-01,2026-02-01,,',
          '1.1.1,T,2026-01-01,2026-01-15,,',
        ]),
      );
      if (!result.ok) {
        expect(result.error).toContain('task "T" has no parent group');
      } else {
        throw new Error("expected failure");
      }
    });

    it("rejects more than three levels of nesting", () => {
      const result = parseProjectCsv(
        lines([
          '1,P,2026-01-01,2026-02-01,,',
          '1.1,G,2026-01-01,2026-01-15,,',
          '1.1.1.1,Deep,2026-01-01,2026-01-15,,',
        ]),
      );
      if (!result.ok) {
        expect(result.error).toContain("only three levels");
      } else {
        throw new Error("expected failure");
      }
    });

    it("rejects an unknown predecessor with a row number", () => {
      const result = parseProjectCsv(
        lines([
          '1,P,2026-01-01,2026-02-01,,',
          '1.1,G,2026-01-01,2026-01-15,,',
          '1.1.1,T,2026-01-01,2026-01-15,1.9,',
        ]),
      );
      if (!result.ok) {
        expect(result.error).toBe('Row 4: unknown predecessor "1.9".');
      } else {
        throw new Error("expected failure");
      }
    });

    it("completes a cycle without dropping tasks", () => {
      const result = parseProjectCsv(
        lines([
          '1,P,2026-01-01,2026-02-01,,',
          '1.1,G,2026-01-01,2026-01-15,,',
          '1.1.1,A,2026-01-01,2026-01-02,1.1.2,',
          '1.1.2,B,2026-01-03,2026-01-04,1.1.1,',
        ]),
      );
      if (!result.ok) throw new Error(`expected success, got ${result.error}`);
      expect(result.project.milestones[0].tasks.map((t) => t.title)).toEqual([
        "A",
        "B",
      ]);
    });

    it("signals an oversized file", () => {
      const big = ("1,P,2026-01-01,2026-02-01,,\n").repeat(90000);
      const result = parseProjectCsv(big);
      if (result.ok) throw new Error("expected failure");
      expect(result.error).toContain("File is too large");
    });
  });
});