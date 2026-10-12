-- AlterEnum
-- A "normal user" joins the account roles: projects and kanban boards only.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'NORMAL' BEFORE 'STUDENT';
