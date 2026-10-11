import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ownerWhere } from "@/lib/access";
import {
  findMilestoneForUser,
  findProjectForUser,
  findTaskForUser,
  listProjectsForUser,
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
