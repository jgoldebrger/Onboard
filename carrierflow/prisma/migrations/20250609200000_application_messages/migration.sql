-- CreateEnum
CREATE TYPE "MessageAuthorRole" AS ENUM ('ADMIN', 'CARRIER');

-- CreateTable
CREATE TABLE "ApplicationMessage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" "MessageAuthorRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationMessage_applicationId_createdAt_idx" ON "ApplicationMessage"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationMessage" ADD CONSTRAINT "ApplicationMessage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OnboardingApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMessage" ADD CONSTRAINT "ApplicationMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
