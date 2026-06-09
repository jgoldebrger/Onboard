import type { QualificationStatus } from "@prisma/client";
import { db } from "@/lib/db";

export async function ensureCarrierProfile(applicationId: string) {
  const existing = await db.carrierProfile.findUnique({
    where: { applicationId },
  });
  if (existing) return existing;

  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: {
      govVerifications: { orderBy: { verifiedAt: "desc" }, take: 1 },
      answers: { include: { question: true } },
    },
  });
  if (!application || application.status !== "APPROVED") {
    return null;
  }

  const gov = application.govVerifications[0];
  const legalNameAnswer = application.answers.find(
    (a) => a.question.key === "company_legal_name",
  );

  return db.carrierProfile.create({
    data: {
      applicationId,
      dotNumber: gov?.dotNumber ?? null,
      mcNumber: gov?.mcNumber ?? null,
      legalName:
        gov?.companyName ??
        (typeof legalNameAnswer?.value === "string"
          ? legalNameAnswer.value
          : null),
      approvedAt: application.submittedAt ?? application.updatedAt,
    },
  });
}

export async function listApprovedCarrierProfiles() {
  return db.carrierProfile.findMany({
    include: {
      application: {
        select: {
          id: true,
          status: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateProfileQualification(
  profileId: string,
  status: QualificationStatus,
) {
  return db.carrierProfile.update({
    where: { id: profileId },
    data: {
      qualificationStatus: status,
      lastCheckedAt: new Date(),
    },
  });
}
