-- AlterTable
ALTER TABLE "OnboardingApplication" ADD COLUMN "fraudWaiverReason" TEXT;
ALTER TABLE "OnboardingApplication" ADD COLUMN "fraudWaiverAt" TIMESTAMP(3);
ALTER TABLE "OnboardingApplication" ADD COLUMN "fraudWaiverById" TEXT;
ALTER TABLE "OnboardingApplication" ADD COLUMN "fraudWaiverScore" INTEGER;
ALTER TABLE "OnboardingApplication" ADD COLUMN "fraudWaiverLevel" TEXT;

-- AddForeignKey
ALTER TABLE "OnboardingApplication" ADD CONSTRAINT "OnboardingApplication_fraudWaiverById_fkey" FOREIGN KEY ("fraudWaiverById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
