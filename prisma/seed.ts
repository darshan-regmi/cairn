import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

/**
 * The seed only guarantees a login account. It creates no projects, so a fresh
 * database starts empty and you add your own work from the dashboard. The user
 * is upserted, so re-running the seed never touches your existing data.
 */
async function main() {
  const email = "demo@example.com";
  const passwordHash = await hashPassword("demo1234");

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo Student", passwordHash },
  });

  console.log("Seeded login account (no projects):");
  console.log(`  ${email} / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
