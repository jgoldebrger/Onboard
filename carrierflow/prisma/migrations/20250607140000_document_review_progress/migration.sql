-- AlterTable
ALTER TABLE "DocumentReview" ADD COLUMN "reviewProgress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DocumentReview" ADD COLUMN "reviewStep" TEXT;
