import { db } from "@/lib/db";

export async function assertCoiRenewalEligible(applicationId: string, userId: string) {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      userId: true,
      status: true,
      carrierProfile: { select: { id: true } },
    },
  });

  if (!application) {
    return { error: "not_found" as const };
  }
  if (application.userId !== userId) {
    return { error: "forbidden" as const };
  }
  if (application.status !== "APPROVED") {
    return { error: "not_approved" as const };
  }
  if (!application.carrierProfile) {
    return { error: "no_profile" as const };
  }

  const coiType = await db.documentType.findUnique({
    where: { key: "coi" },
    select: { id: true, key: true, name: true },
  });
  if (!coiType) {
    return { error: "coi_type_missing" as const };
  }

  return {
    application,
    carrierProfileId: application.carrierProfile.id,
    coiType,
  };
}
