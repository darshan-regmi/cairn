-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IN_PROGRESS', 'COMPLETE');

-- AlterTable: a project now carries a status and, once complete, a timestamp.
ALTER TABLE "Project"
  ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: the old archive flag becomes the COMPLETE status. Nothing is lost.
UPDATE "Project"
SET "status" = 'COMPLETE', "completedAt" = "archivedAt"
WHERE "archivedAt" IS NOT NULL;

-- DropColumn
ALTER TABLE "Project" DROP COLUMN "archivedAt";
