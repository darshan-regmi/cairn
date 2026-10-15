-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerifiedAt",
DROP COLUMN "failedLoginCount",
DROP COLUMN "lockedUntil",
DROP COLUMN "passwordHash",
ADD COLUMN     "firebaseUid" TEXT;

-- DropTable
DROP TABLE "PasswordResetToken";

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

