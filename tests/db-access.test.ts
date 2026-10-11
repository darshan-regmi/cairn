import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import {
  findMeetingsForUser,
  findMilestoneForUser,
  findProjectForUser,
  findQuestionsForUser,
  findDashboardForUser,
  findSharedProject,
  findSupervisorProject,
  findTaskForUser,
  listCommentsForTarget,
  listCommentsForTargets,
  listOwnedProjectsForUser,
  listProjectsForUser,
  listSupervisedProjectsForUser,
  projectExists,
} from "@/lib/data";

/**
 * Real-DB authorization tests. They only run when DATABASE_URL is set
 * (locally: docker compose up; in CI: the postgres service). Each run uses
 * throwaway users and cleans up after itself, so the seeded demo data is
 * never touched.
 */
const describeDb = describe.skipIf(!process.env.DATABASE_URL);

describeDb("DB-backed authorization", () => {
  let ownerId = "";
  let supervisorId = "";
  let intruderId = "";
  let projectId = "";
  let milestoneId = "";
  let taskId = "";
  // Access cascades from ProjectMember now, not from an owner column, so we
  // collect the projects we create and remove them explicitly in afterAll.
  const createdProjectIds: string[] = [];

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;

    const tag = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const owner = await prisma.user.create({
      data: {
        email: `owner_${tag}@fyp-planner.test`,
        passwordHash: "scrypt:0:test-only",
        name: "Owner",
      },
    });
    const supervisor = await prisma.user.create({
      data: {
        email: `supervisor_${tag}@fyp-planner.test`,
        passwordHash: "scrypt:0:test-only",
        name: "Supervisor",
        role: "SUPERVISOR",
      },
    });
    const intruder = await prisma.user.create({
      data: {
        email: `intruder_${tag}@fyp-planner.test`,
        passwordHash: "scrypt:0:test-only",
        name: "Intruder",
      },
    });
    ownerId = owner.id;
    supervisorId = supervisor.id;
    intruderId = intruder.id;

    const project = await prisma.project.create({
      data: {
        title: `Authorization test ${tag}`,
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 11, 31),
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: supervisor.id, role: "SUPERVISOR" },
          ],
        },
      },
    });
    projectId = project.id;
    createdProjectIds.push(project.id);

    const milestone = await prisma.milestone.create({
      data: {
        projectId: project.id,
        name: "Milestone one",
        plannedStart: new Date(2026, 0, 1),
        plannedEnd: new Date(2026, 2, 31),
        order: 0,
      },
    });
    milestoneId = milestone.id;

    const task = await prisma.task.create({
      data: {
        milestoneId: milestone.id,
        title: "Do the thing",
        status: "TODO",
        priority: "MEDIUM",
        order: 0,
      },
    });
    taskId = task.id;
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, supervisorId, intruderId] } },
    });
  });

  describe("membership-scoped reads", () => {
    it("shows the project to its owner and to an invited supervisor", async () => {
      const ownerView = await findProjectForUser(projectId, ownerId);
      expect(ownerView).not.toBeNull();
      expect(ownerView?.title).toContain("Authorization test");

      const supervisorView = await findProjectForUser(projectId, supervisorId);
      expect(supervisorView).not.toBeNull();
      expect(supervisorView?.id).toBe(projectId);
    });

    it("returns nothing to someone with no membership", async () => {
      expect(await findProjectForUser(projectId, intruderId)).toBeNull();
    });

    it("scopes the milestone through project membership", async () => {
      const ownerView = await findMilestoneForUser(milestoneId, ownerId);
      expect(ownerView).not.toBeNull();
      expect(ownerView?.project.id).toBe(projectId);

      expect(
        await findMilestoneForUser(milestoneId, supervisorId),
      ).not.toBeNull();
      expect(await findMilestoneForUser(milestoneId, intruderId)).toBeNull();
    });

    it("scopes a task through milestone -> project membership", async () => {
      const ownerView = await findTaskForUser(taskId, ownerId);
      expect(ownerView).not.toBeNull();
      expect(ownerView?.title).toBe("Do the thing");

      expect(await findTaskForUser(taskId, supervisorId)).not.toBeNull();
      expect(await findTaskForUser(taskId, intruderId)).toBeNull();
    });

    it("lists the project for members but never for a non-member", async () => {
      const intruderList = await listProjectsForUser(intruderId);
      expect(intruderList.some((p) => p.id === projectId)).toBe(false);

      const ownerList = await listProjectsForUser(ownerId);
      expect(ownerList.some((p) => p.id === projectId)).toBe(true);

      const supervisorList = await listProjectsForUser(supervisorId);
      expect(supervisorList.some((p) => p.id === projectId)).toBe(true);
    });

    it("returns null for ids that do not exist at all", async () => {
      const missing = "cafebabe".repeat(3);
      expect(await findProjectForUser(missing, ownerId)).toBeNull();
      expect(await findMilestoneForUser(missing, ownerId)).toBeNull();
      expect(await findTaskForUser(missing, ownerId)).toBeNull();
    });
  });

  describe("no-access vs not-found", () => {
    it("tells a real project apart from a missing one", async () => {
      expect(await projectExists(projectId)).toBe(true);
      expect(await projectExists("cafebabe".repeat(3))).toBe(false);
    });
  });

  describe("owner-only writes", () => {
    it("matches the project for the owner but not for a supervisor", async () => {
      const forOwner = await prisma.project.findFirst({
        where: { id: projectId, ...ownerWhere(ownerId) },
      });
      expect(forOwner).not.toBeNull();

      const forSupervisor = await prisma.project.findFirst({
        where: { id: projectId, ...ownerWhere(supervisorId) },
      });
      expect(forSupervisor).toBeNull();
    });
  });

  describe("supervisor access", () => {
    it("lists owned and supervised projects in separate lists", async () => {
      const ownedByOwner = await listOwnedProjectsForUser(ownerId);
      expect(ownedByOwner.some((p) => p.id === projectId)).toBe(true);
      const supervisedByOwner = await listSupervisedProjectsForUser(ownerId);
      expect(supervisedByOwner.some((p) => p.id === projectId)).toBe(false);

      const ownedBySupervisor = await listOwnedProjectsForUser(supervisorId);
      expect(ownedBySupervisor.some((p) => p.id === projectId)).toBe(false);
      const supervisedBySupervisor =
        await listSupervisedProjectsForUser(supervisorId);
      expect(supervisedBySupervisor.some((p) => p.id === projectId)).toBe(true);
    });

    it("opens the read-only view only for supervisors", async () => {
      const view = await findSupervisorProject(projectId, supervisorId);
      expect(view).not.toBeNull();
      expect(view?.milestones.length).toBe(1);

      expect(await findSupervisorProject(projectId, ownerId)).toBeNull();
      expect(await findSupervisorProject(projectId, intruderId)).toBeNull();
    });

    it("stores a comment on a milestone and lists it with its author", async () => {
      await prisma.comment.create({
        data: {
          projectId,
          authorId: supervisorId,
          targetType: "MILESTONE",
          targetId: milestoneId,
          body: "Good progress here — worth a short demo next meeting.",
        },
      });

      const comments = await listCommentsForTarget("MILESTONE", milestoneId);
      expect(comments).toHaveLength(1);
      expect(comments[0].body).toContain("Good progress here");
      expect(comments[0].author.email).toContain("supervisor_");
    });
  });

  describe("meetings and agreed actions", () => {
    let meetingId = "";

    beforeAll(async () => {
      const meeting = await prisma.meeting.create({
        data: {
          projectId,
          milestoneId,
          date: new Date(2026, 1, 3),
          nextMeetingDate: new Date(2026, 1, 17),
          itemsDiscussed: "Progress on the foundation milestone.",
          problems: "Waiting on the dataset.",
          actionItems: { create: [{ text: "Draft the evaluation plan" }] },
        },
      });
      meetingId = meeting.id;
    });

    it("lists a meeting for the owner with its agreed actions", async () => {
      const view = await findMeetingsForUser(projectId, ownerId);
      expect(view).not.toBeNull();
      const meeting = view?.meetings.find((m) => m.id === meetingId);
      expect(meeting).toBeDefined();
      expect(meeting?.actionItems).toHaveLength(1);
      expect(meeting?.actionItems[0].text).toBe("Draft the evaluation plan");
      expect(meeting?.actionItems[0].task).toBeNull();
    });

    it("returns nothing to a non-member", async () => {
      expect(await findMeetingsForUser(projectId, intruderId)).toBeNull();
    });

    it("reads a converted action back with its board task", async () => {
      const action = await prisma.meetingTask.findFirstOrThrow({
        where: { meetingId },
      });
      const task = await prisma.task.create({
        data: {
          milestoneId,
          title: action.text,
          status: "TODO",
          priority: "MEDIUM",
          source: "MEETING",
          sourceMeetingId: meetingId,
          order: 99,
        },
      });
      await prisma.meetingTask.update({
        where: { id: action.id },
        data: { taskId: task.id },
      });

      const view = await findMeetingsForUser(projectId, ownerId);
      const converted = view?.meetings
        .find((m) => m.id === meetingId)
        ?.actionItems.find((a) => a.id === action.id);
      expect(converted?.task?.id).toBe(task.id);
      expect(converted?.task?.milestoneId).toBe(milestoneId);
    });
  });

  describe("open questions", () => {
    let questionId = "";

    beforeAll(async () => {
      const question = await prisma.question.create({
        data: {
          projectId,
          milestoneId,
          title: "Do we need a native mobile app?",
          context: "The web app is already responsive.",
          ifWeDoIt: "A second codebase to maintain.",
          whatItCosts: "Six weeks of the final term.",
          ifWeDont: "Reviewers may ask about mobile support.",
        },
      });
      questionId = question.id;
    });

    it("lists a question for the owner with its weighing-up notes", async () => {
      const view = await findQuestionsForUser(projectId, ownerId);
      expect(view).not.toBeNull();
      const question = view?.questions.find((q) => q.id === questionId);
      expect(question?.title).toContain("native mobile app");
      expect(question?.whatItCosts).toContain("Six weeks");
      expect(question?.task).toBeNull();
    });

    it("returns nothing to a non-member", async () => {
      expect(await findQuestionsForUser(projectId, intruderId)).toBeNull();
    });

    it("reads an adopted question back with its board task", async () => {
      const task = await prisma.task.create({
        data: {
          milestoneId,
          title: "Do we need a native mobile app?",
          status: "TODO",
          priority: "MEDIUM",
          source: "QUESTION",
          sourceQuestionId: questionId,
          order: 98,
        },
      });
      await prisma.question.update({
        where: { id: questionId },
        data: {
          status: "ADOPTED",
          decidedAt: new Date(),
          decision: "Web-only for this year.",
        },
      });

      const view = await findQuestionsForUser(projectId, ownerId);
      const adopted = view?.questions.find((q) => q.id === questionId);
      expect(adopted?.task?.id).toBe(task.id);
      expect(adopted?.task?.milestoneId).toBe(milestoneId);
      expect(adopted?.decision).toBe("Web-only for this year.");
    });
  });

  describe("milestone reviews", () => {
    it("reads a milestone for the owner with its review attached", async () => {
      await prisma.review.create({
        data: {
          milestoneId,
          date: new Date(2026, 0, 15),
          verdict: "PARTLY_MET",
          askedFor: "A working upload.",
          demonstrated: "Upload works, but no progress bar.",
          promised: "Progress bar by the next review.",
        },
      });

      const view = await findMilestoneForUser(milestoneId, ownerId);
      expect(view?.review?.verdict).toBe("PARTLY_MET");
      expect(view?.review?.askedFor).toContain("upload");
      expect(view?.review?.promised).toContain("Progress bar");
    });

    it("surfaces the verdict on the project timeline for the owner", async () => {
      const view = await findProjectForUser(projectId, ownerId);
      const milestone = view?.milestones.find((m) => m.id === milestoneId);
      expect(milestone?.review?.verdict).toBe("PARTLY_MET");
    });

    it("shows the review to a supervisor through the supervised project", async () => {
      const view = await findSupervisorProject(projectId, supervisorId);
      const milestone = view?.milestones.find((m) => m.id === milestoneId);
      expect(milestone?.review?.verdict).toBe("PARTLY_MET");
    });

    it("hides the milestone and its review from a non-member", async () => {
      expect(await findMilestoneForUser(milestoneId, intruderId)).toBeNull();
    });
  });

  describe("milestone evidence", () => {
    it("attaches evidence to a milestone for the owner", async () => {
      await prisma.evidence.create({
        data: {
          milestoneId,
          title: "End-to-end upload demo",
          date: new Date(2026, 1, 10),
          type: "DEMO",
          url: "https://example.com/demo",
          whatItProves: "The happy path works end to end.",
        },
      });

      const view = await findMilestoneForUser(milestoneId, ownerId);
      expect(view?.evidence).toHaveLength(1);
      expect(view?.evidence[0]?.type).toBe("DEMO");
      expect(view?.evidence[0]?.url).toContain("example.com");
    });

    it("lists the newest evidence first", async () => {
      await prisma.evidence.create({
        data: {
          milestoneId,
          title: "Older benchmark",
          date: new Date(2026, 1, 1),
          type: "BENCHMARK",
        },
      });

      const view = await findMilestoneForUser(milestoneId, ownerId);
      expect(view?.evidence.map((item) => item.title)).toEqual([
        "End-to-end upload demo",
        "Older benchmark",
      ]);
    });

    it("shows evidence to a supervisor through the supervised project", async () => {
      const view = await findSupervisorProject(projectId, supervisorId);
      const milestone = view?.milestones.find((m) => m.id === milestoneId);
      expect(milestone?.evidence).toHaveLength(2);
      expect(milestone?.evidence[0]?.title).toContain("upload demo");
    });
  });

  describe("deliverables and milestone details", () => {
    it("carries scope and definition of done on the milestone", async () => {
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          scope: "Upload only",
          definitionOfDone: "A file uploads to disk.",
        },
      });

      const view = await findMilestoneForUser(milestoneId, ownerId);
      expect(view?.scope).toBe("Upload only");
      expect(view?.definitionOfDone).toBe("A file uploads to disk.");
    });

    it("returns deliverables in order, with their done state", async () => {
      await prisma.deliverable.createMany({
        data: [
          { milestoneId, title: "Working upload page", order: 0 },
          {
            milestoneId,
            title: "Benchmark table",
            order: 1,
            doneAt: new Date(2026, 2, 1),
          },
        ],
      });

      const view = await findMilestoneForUser(milestoneId, ownerId);
      expect(view?.deliverables.map((deliverable) => deliverable.title)).toEqual(
        ["Working upload page", "Benchmark table"],
      );
      expect(view?.deliverables[1]?.doneAt).toBeInstanceOf(Date);
    });

    it("shows deliverables to a supervisor through the supervised project", async () => {
      const view = await findSupervisorProject(projectId, supervisorId);
      const milestone = view?.milestones.find((m) => m.id === milestoneId);
      expect(milestone?.deliverables).toHaveLength(2);
    });
  });

  describe("comments for many targets", () => {
    it("returns comments for the given targets, filtered by type", async () => {
      await prisma.comment.createMany({
        data: [
          {
            projectId,
            targetType: "MILESTONE",
            targetId: milestoneId,
            authorId: ownerId,
            body: "On the milestone",
          },
          {
            projectId,
            targetType: "TASK",
            targetId: taskId,
            authorId: supervisorId,
            body: "On the task",
          },
          {
            projectId,
            targetType: "TASK",
            targetId: taskId,
            authorId: ownerId,
            body: "Also on the task",
          },
        ],
      });

      const taskComments = await listCommentsForTargets("TASK", [taskId]);
      expect(taskComments).toHaveLength(2);
      expect(taskComments.every((c) => c.targetId === taskId)).toBe(true);
      expect(taskComments[0]?.author.email).toContain("supervisor_");

      const milestoneComments = await listCommentsForTargets("MILESTONE", [
        milestoneId,
      ]);
      expect(milestoneComments.map((c) => c.body)).toContain("On the milestone");
      // A query for one target type must not leak another's comments.
      expect(milestoneComments.map((c) => c.body)).not.toContain("On the task");
    });

    it("returns nothing for an empty target list", async () => {
      expect(await listCommentsForTargets("EVIDENCE", [])).toEqual([]);
    });
  });

  describe("dashboard overview", () => {
    it("returns the owner's projects with their milestones and tasks", async () => {
      const rows = await findDashboardForUser(ownerId);
      const project = rows.find((row) => row.id === projectId);
      expect(project?.milestones[0]?.tasks.some((t) => t.id === taskId)).toBe(
        true,
      );
    });

    it("returns nothing for a supervisor or a non-member", async () => {
      expect(await findDashboardForUser(supervisorId)).toHaveLength(0);
      expect(await findDashboardForUser(intruderId)).toHaveLength(0);
    });
  });

  describe("public share links", () => {
    it("opens a project through an active token, with no membership", async () => {
      const token = "a".repeat(32);
      await prisma.project.update({
        where: { id: projectId },
        data: { shareToken: token, shareExpiresAt: null },
      });

      const view = await findSharedProject(token);
      expect(view?.id).toBe(projectId);
      expect(view?.milestones.length).toBeGreaterThan(0);
    });

    it("returns null for an expired token", async () => {
      const token = "b".repeat(32);
      await prisma.project.update({
        where: { id: projectId },
        data: {
          shareToken: token,
          shareExpiresAt: new Date(Date.now() - 60_000),
        },
      });

      expect(await findSharedProject(token)).toBeNull();
    });

    it("returns null once the link is revoked", async () => {
      await prisma.project.update({
        where: { id: projectId },
        data: { shareToken: null, shareExpiresAt: null },
      });

      expect(await findSharedProject("a".repeat(32))).toBeNull();
    });
  });

  describe("imported plans stay membership-scoped", () => {
    // Mirrors the shape importProjectAction writes: a project with a goal,
    // milestones with goals/order and tasks with notes and due dates.
    let importedProjectId = "";
    let importedMilestoneId = "";
    let importedTaskId = "";

    beforeAll(async () => {
      const tag = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const project = await prisma.project.create({
        data: {
          title: `Imported plan ${tag}`,
          goal: "Plan imported from a CSV",
          startDate: new Date(2026, 0, 1),
          endDate: new Date(2026, 11, 31),
          members: { create: { userId: ownerId, role: "OWNER" } },
        },
      });
      const milestone = await prisma.milestone.create({
        data: {
          projectId: project.id,
          name: "Phase 1 (M1): Foundation",
          goal: "Server skeleton, auth, DB schema",
          plannedStart: new Date(2026, 0, 1),
          plannedEnd: new Date(2026, 1, 28),
          order: 0,
        },
      });
      const task = await prisma.task.create({
        data: {
          milestoneId: milestone.id,
          title: "Design the schema",
          status: "TODO",
          priority: "MEDIUM",
          order: 0,
          due: new Date(2026, 0, 10),
          notes: "Users, nodes, chunks\nDepends on: Set up the repo",
        },
      });
      importedProjectId = project.id;
      importedMilestoneId = milestone.id;
      importedTaskId = task.id;
      createdProjectIds.push(project.id);
    });

    it("hides an imported project from other users", async () => {
      expect(
        await findProjectForUser(importedProjectId, ownerId),
      ).not.toBeNull();
      expect(await findProjectForUser(importedProjectId, intruderId)).toBeNull();
      expect(
        (await listProjectsForUser(intruderId)).some(
          (p) => p.id === importedProjectId,
        ),
      ).toBe(false);
    });

    it("scopes an imported milestone and its tasks to the owner", async () => {
      const ownerMilestone = await findMilestoneForUser(
        importedMilestoneId,
        ownerId,
      );
      expect(ownerMilestone?.goal).toBe("Server skeleton, auth, DB schema");
      expect(
        await findMilestoneForUser(importedMilestoneId, intruderId),
      ).toBeNull();

      const ownerTask = await findTaskForUser(importedTaskId, ownerId);
      expect(ownerTask?.notes).toContain("Depends on:");
      expect(await findTaskForUser(importedTaskId, intruderId)).toBeNull();
    });
  });
});
