import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { adminAuth } from "../src/lib/firebase/admin";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

/**
 * The seed only guarantees a login account. It creates no projects, so a fresh
 * database starts empty and you add your own work from the dashboard. Both the
 * Firebase user and the app row are upserted, so re-running the seed never
 * touches your existing data.
 */
async function main() {
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
