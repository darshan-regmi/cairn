-- AlterTable
-- New accounts default to the baseline role; sign up still sends an explicit
-- choice, so this only matters for rows created without one.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'NORMAL';
