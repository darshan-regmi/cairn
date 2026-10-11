import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

function dayOffset(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

async function main() {
  const email = "demo@example.com";
  const passwordHash = await hashPassword("demo1234");

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Demo Student" },
    create: { email, name: "Demo Student", passwordHash },
  });

  // Wipe any previous demo project so reseeding is repeatable.
  const existing = await prisma.project.findFirst({ where: { title: DEMO_TITLE } });
  if (existing) {
    await prisma.project.delete({ where: { id: existing.id } });
  }

  const project = await prisma.project.create({
    data: {
      title: DEMO_TITLE,
      startDate: dayOffset(-21),
      endDate: dayOffset(161),
      shareToken: randomBytes(16).toString("hex"),
      members: { create: { userId: user.id, role: "OWNER" } },
      milestones: {
        create: [
          {
            name: "M1 Foundation",
            status: "IN_PROGRESS",
            plannedStart: dayOffset(-21),
            plannedEnd: dayOffset(7),
            actualStart: dayOffset(-21),
            commitRange: "1-17",
            goal: "Storage, chunking and the project shell working end to end.",
            order: 1,
          },
          {
            name: "M2 Chunking and reassembly",
            status: "PLANNED",
            plannedStart: dayOffset(7),
            plannedEnd: dayOffset(28),
            goal: "Robust chunked upload and ordered reassembly with checksums.",
            order: 2,
          },
          {
            name: "M3 Feed and DM screens",
            status: "PLANNED",
            plannedStart: dayOffset(28),
            plannedEnd: dayOffset(56),
            goal: "Usable feed and direct-message screens on phone-sized layouts.",
            order: 3,
          },
          {
            name: "M4 Resilience",
            status: "PLANNED",
            plannedStart: dayOffset(56),
            plannedEnd: dayOffset(84),
            goal: "Retries, recovery after crashes, and graceful offline behaviour.",
            order: 4,
          },
          {
            name: "M5 End-to-end encrypted DMs",
            status: "PLANNED",
            plannedStart: dayOffset(84),
            plannedEnd: dayOffset(119),
            goal: "Encrypted direct messages with key exchange and verification.",
            order: 5,
          },
          {
            name: "M6 Strengthening",
            status: "PLANNED",
            plannedStart: dayOffset(119),
            plannedEnd: dayOffset(140),
            goal: "Security review, media handling, and performance polish.",
            order: 6,
          },
          {
            name: "M7 Testing and evaluation",
            status: "PLANNED",
            plannedStart: dayOffset(140),
            plannedEnd: dayOffset(161),
            goal: "Evaluation against aims, final report, and viva preparation.",
            order: 7,
          },
        ],
      },
    },
    include: { milestones: { orderBy: { order: "asc" } } },
  });

  const m1 = project.milestones[0];
  const m3 = project.milestones[2];

  const meeting1 = await prisma.meeting.create({
    data: {
      projectId: project.id,
      milestoneId: m1.id,
      date: dayOffset(-10),
      nextMeetingDate: dayOffset(-3),
      itemsDiscussed:
        "Project scope and the chunked-transfer design. Agreed the working title of the FYP.",
      achievements:
        "Project shell repo is live with CI; Docker Postgres is working locally.",
      problems:
        "No clear answer yet on how much chunk metadata to persist per chunk.",
      actionItems: {
        create: [
          { text: "Basic project board wireframes" },
          { text: "Propose gesture navigation for the feed" },
        ],
      },
    },
  });

  await prisma.meeting.create({
    data: {
      projectId: project.id,
      milestoneId: m1.id,
      date: dayOffset(-3),
      nextMeetingDate: dayOffset(4),
      itemsDiscussed:
        "Chunk upload endpoint progress and the blocked item on migration strategy.",
      achievements: "",
      problems:
        "Chunk retry currently drops checksum info; unclear how much to store per chunk.",
      actionItems: {
        create: [
          { text: "Check upload speed on 5G" },
          { text: "Rough slide outline for the M1 demo" },
        ],
      },
    },
  });

  await prisma.question.createMany({
    data: [
      {
        projectId: project.id,
        milestoneId: m1.id,
        title: "Compress chunks before upload, or upload raw?",
        status: "OPEN",
        raisedAt: dayOffset(-9),
        context:
          "Compression would shrink transfer time but adds CPU cost and complicates chunk offsets.",
        ifWeDoIt:
          "Faster uploads on constrained connections; smaller server storage.",
        whatItCosts: "One more pipeline stage and double-checking offsets.",
        ifWeDont: "Transfers stay straightforward but slower on poor networks.",
      },
      {
        projectId: project.id,
        milestoneId: m3.id,
        title: "Should DM messages show read receipts?",
        status: "PARKED",
        raisedAt: dayOffset(-12),
        decidedAt: dayOffset(-2),
        context: "Nice social cue, but adds state and potential privacy questions.",
        ifWeDoIt: "Better UX feedback for the sender.",
        whatItCosts: "Delivery/read state tracking on the server.",
        ifWeDont: "Senders cannot tell if a message was read.",
        decision:
          "Parked. Revisit after the viva timeline is fixed, when there is time to weigh privacy trade-offs.",
      },
      {
        projectId: project.id,
        milestoneId: m1.id,
        title: "Resume uploads across app restarts in M1?",
        status: "DROPPED",
        raisedAt: dayOffset(-8),
        decidedAt: dayOffset(-1),
        context:
          "Restart resume needs server-side session state for partially uploaded files.",
        ifWeDoIt: "Intermittent connections recover without restarting transfers.",
        whatItCosts: "Server-side upload sessions plus cleanup.",
        ifWeDont: "An interrupted upload restarts from zero.",
        decision:
          "Out of scope for M1. Restart resume needs server-side state that is better done in M4 (Resilience).",
      },
    ],
  });

  // 17 tasks for M1, spread across all four statuses.
  // taskDefs is a checklist of [title, status, priority, dueOffset, source, commit, notes]
  type TaskDef = [
    string,
    "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE",
    "HIGH" | "MEDIUM" | "LOW",
    number | null,
    "PLANNED" | "MEETING" | "QUESTION" | "REVIEW",
    string | null,
    string | null,
  ];

  const taskDefs: TaskDef[] = [
    ["Set up project scaffolding and CI", "DONE", "HIGH", -14, "PLANNED", "1-4", null],
    ["Local Postgres with Docker Compose", "DONE", "MEDIUM", -12, "PLANNED", "5-6", null],
    ["Choose chunk size and serialise chunk metadata", "DONE", "HIGH", -10, "PLANNED", "7-9", null],
    ["Upload and reassemble happy-path unit tests", "DONE", "HIGH", -8, "PLANNED", "10-12", null],
    ["Basic project board wireframes", "DONE", "MEDIUM", -7, "MEETING", "13", "Converted from the 12 Oct meeting."],
    ["Write FYP project plan in shared doc", "DONE", "LOW", -6, "PLANNED", "14", null],
    ["Storage abstraction over the local filesystem", "DONE", "MEDIUM", -15, "PLANNED", "16-17", null],
    ["Chunk file upload endpoint", "IN_PROGRESS", "HIGH", 2, "PLANNED", "15-16", null],
    ["Progress tracking on the client", "IN_PROGRESS", "MEDIUM", 1, "PLANNED", "17", null],
    ["Retry failed chunk uploads", "IN_PROGRESS", "MEDIUM", -1, "PLANNED", null, "Needs a graceful retry loop on the client."],
    ["Decide migration strategy for existing SQLite uploads", "BLOCKED", "HIGH", -2, "PLANNED", null, "Waiting on supervisor advice about backwards compatibility."],
    ["E2E test for the full chunk round trip", "TODO", "HIGH", 3, "PLANNED", null, null],
    ["Chunk checksum validation", "TODO", "MEDIUM", 5, "PLANNED", null, null],
    ["Document the chunk metadata format", "TODO", "LOW", 4, "PLANNED", null, null],
    ["Compression before chunking", "TODO", "LOW", 6, "QUESTION", null, "Depends on the open compression question."],
    ["Chunk store cleanup job", "TODO", "LOW", 7, "PLANNED", null, null],
    ["Instrument upload timings", "TODO", "MEDIUM", 9, "PLANNED", null, null],
  ];

  const orderByStatus: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    DONE: 0,
  };

  for (const [title, status, priority, dueOffset, source, commit, notes] of taskDefs) {
    await prisma.task.create({
      data: {
        milestoneId: m1.id,
        title,
        status,
        priority,
        due: dueOffset === null ? null : dayOffset(dueOffset),
        source,
        commit,
        notes,
        order: orderByStatus[status]++,
        // The "Basic project board wireframes" task was converted from meeting 1.
        sourceMeetingId: title === "Basic project board wireframes" ? meeting1.id : null,
      },
    });
  }

  // The wireframes action line was converted into a card, so link the two.
  const wireframesTask = await prisma.task.findFirst({
    where: { milestoneId: m1.id, title: "Basic project board wireframes" },
    select: { id: true },
  });
  if (wireframesTask) {
    await prisma.meetingTask.updateMany({
      where: { meetingId: meeting1.id, text: "Basic project board wireframes" },
      data: { taskId: wireframesTask.id },
    });
  }

  console.log("Seeded demo project:");
  console.log(`  Login with ${email} / demo1234`);
  console.log(`  Project: ${project.title}`);
  console.log(`  Milestones: ${project.milestones.length} (M1 has ${taskDefs.length} tasks)`);
}

const DEMO_TITLE = "Encrypted file transfer (FYP demo)";

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });