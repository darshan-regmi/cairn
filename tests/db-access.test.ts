import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
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
  let intruderId = "";
  let projectId = "";
  let milestoneId = "";
  let taskId = "";

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
    const intruder = await prisma.user.create({
      data: {
        email: `intruder_${tag}@fyp-planner.test`,
        passwordHash: "scrypt:0:test-only",
        name: "Intruder",
      },
    });
    ownerId = owner.id;
    intruderId = intruder.id;

    const project = await prisma.project.create({
      data: {
        title: `Authorization test ${tag}`,
        ownerId: owner.id,
        startDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 11, 31),
      },
    });
    projectId = project.id;

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
    // Deleting the owner cascades project -> milestone -> task.
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, intruderId] } } });
  });

  describe("owner-scoped reads", () => {
    it("shows the project to its owner but returns nothing to an intruder", async () => {
      const ownerView = await findProjectForUser(projectId, ownerId);
      expect(ownerView).not.toBeNull();
      expect(ownerView?.title).toContain("Authorization test");

      const intruderView = await findProjectForUser(projectId, intruderId);
      expect(intruderView).toBeNull();
    });

    it("scopes the milestone through the project owner", async () => {
      const ownerView = await findMilestoneForUser(milestoneId, ownerId);
      expect(ownerView).not.toBeNull();
      expect(ownerView?.project.ownerId).toBe(ownerId);

      const intruderView = await findMilestoneForUser(milestoneId, intruderId);
      expect(intruderView).toBeNull();
    });

    it("scopes a task through milestone -> project -> owner", async () => {
      const ownerView = await findTaskForUser(taskId, ownerId);
      expect(ownerView).not.toBeNull();
      expect(ownerView?.title).toBe("Do the thing");

      const intruderView = await findTaskForUser(taskId, intruderId);
      expect(intruderView).toBeNull();
    });

    it("never leaks another user's projects into the list query", async () => {
      const intruderList = await listProjectsForUser(intruderId);
      expect(intruderList.some((p) => p.id === projectId)).toBe(false);

      const ownerList = await listProjectsForUser(ownerId);
      expect(ownerList.some((p) => p.id === projectId)).toBe(true);
    });

    it("returns null for ids that do not exist at all", async () => {
      const missing = "cafebabe".repeat(3);
      expect(await findProjectForUser(missing, ownerId)).toBeNull();
      expect(await findMilestoneForUser(missing, ownerId)).toBeNull();
      expect(await findTaskForUser(missing, ownerId)).toBeNull();
    });
  });
});