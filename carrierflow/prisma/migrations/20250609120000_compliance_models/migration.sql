-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('COMPLIANT', 'ATTENTION', 'NON_COMPLIANT', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ComplianceAlertType" AS ENUM ('INSURANCE_EXPIRING', 'INSURANCE_EXPIRED', 'AUTHORITY_INACTIVE', 'CSA_THRESHOLD', 'DOC_EXPIRED', 'FMCSA_DATA_CHANGED', 'RULE_VIOLATION');

-- CreateEnum
CREATE TYPE "ComplianceAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "CarrierProfile" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "dotNumber" TEXT,
    "mcNumber" TEXT,
    "legalName" TEXT,
    "qualificationStatus" "QualificationStatus" NOT NULL DEFAULT 'COMPLIANT',
    "lastCheckedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceSnapshot" (
    "id" TEXT NOT NULL,
    "carrierProfileId" TEXT NOT NULL,
    "fmcsaData" JSONB,
    "documentFlags" JSONB,
    "ruleResults" JSONB,
    "derivedFlags" TEXT[],
    "qualificationStatus" "QualificationStatus" NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAlert" (
    "id" TEXT NOT NULL,
    "carrierProfileId" TEXT NOT NULL,
    "type" "ComplianceAlertType" NOT NULL,
    "status" "ComplianceAlertStatus" NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "acknowledgedNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredDocument" (
    "id" TEXT NOT NULL,
    "carrierProfileId" TEXT NOT NULL,
    "documentTypeKey" TEXT NOT NULL,
    "documentId" TEXT,
    "policyNumber" TEXT,
    "limits" JSONB,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "certificateHolder" TEXT,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarrierProfile_applicationId_key" ON "CarrierProfile"("applicationId");

-- CreateIndex
CREATE INDEX "ComplianceSnapshot_carrierProfileId_checkedAt_idx" ON "ComplianceSnapshot"("carrierProfileId", "checkedAt");

-- CreateIndex
CREATE INDEX "ComplianceAlert_carrierProfileId_status_idx" ON "ComplianceAlert"("carrierProfileId", "status");

-- CreateIndex
CREATE INDEX "ComplianceAlert_status_createdAt_idx" ON "ComplianceAlert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MonitoredDocument_carrierProfileId_documentTypeKey_idx" ON "MonitoredDocument"("carrierProfileId", "documentTypeKey");

-- CreateIndex
CREATE INDEX "MonitoredDocument_expirationDate_idx" ON "MonitoredDocument"("expirationDate");

-- AddForeignKey
ALTER TABLE "CarrierProfile" ADD CONSTRAINT "CarrierProfile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OnboardingApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSnapshot" ADD CONSTRAINT "ComplianceSnapshot_carrierProfileId_fkey" FOREIGN KEY ("carrierProfileId") REFERENCES "CarrierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_carrierProfileId_fkey" FOREIGN KEY ("carrierProfileId") REFERENCES "CarrierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredDocument" ADD CONSTRAINT "MonitoredDocument_carrierProfileId_fkey" FOREIGN KEY ("carrierProfileId") REFERENCES "CarrierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
