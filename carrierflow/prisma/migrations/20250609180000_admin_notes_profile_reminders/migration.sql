-- AlterTable
ALTER TABLE "User" ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "contactEmail" TEXT;

-- AlterTable
ALTER TABLE "OnboardingApplication" ADD COLUMN "lastOnboardingReminderAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ApplicationAdminNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationAdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationAdminNote_applicationId_createdAt_idx" ON "ApplicationAdminNote"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationAdminNote" ADD CONSTRAINT "ApplicationAdminNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OnboardingApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAdminNote" ADD CONSTRAINT "ApplicationAdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
