import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { deploymentMode } from "../src/lib/deployment";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Self-host has no Firebase account to attach to. The first person to open
  // the app creates the account at /setup, so there is nothing to seed.
  if (deploymentMode() === "selfhost") {
    console.log(
      "Self-host mode: no demo account is seeded. Open /setup to create the first account.",
    );
    return;
  }

  const { adminAuth } = await import("../src/lib/firebase/admin");

  const email = "demo@example.com";
  const password = "demo1234";

  let firebaseUser;
  try {
    firebaseUser = await adminAuth().getUserByEmail(email);
  } catch {
    firebaseUser = await adminAuth().createUser({
      email,
      password,
      emailVerified: true,
      displayName: "Demo User",
    });
  }

  await prisma.user.upsert({
    where: { email },
    update: { firebaseUid: firebaseUser.uid },
    create: { email, name: "Demo User", firebaseUid: firebaseUser.uid },
  });

  console.log("Seeded login account (no projects):");
  console.log(`  ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
