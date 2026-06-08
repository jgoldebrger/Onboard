import { db } from "@/lib/db";

export async function applyCarrierType(
  applicationId: string,
  slug: string,
): Promise<boolean> {
  const carrierType = await db.carrierType.findFirst({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (!carrierType) return false;

  await db.onboardingApplication.update({
    where: { id: applicationId },
    data: {
      carrierTypeId: carrierType.id,
      detectedType: slug,
      status: "IN_PROGRESS",
    },
  });
  return true;
}

export async function inferCarrierTypeFromMessage(
  applicationId: string,
  message: string,
): Promise<string | undefined> {
  const lower = message.toLowerCase();
  const types = await db.carrierType.findMany({
    where: { isActive: true },
    select: { slug: true },
  });

  for (const { slug } of types) {
    const spaced = slug.replace(/-/g, " ");
    if (lower.includes(slug) || lower.includes(spaced)) {
      await applyCarrierType(applicationId, slug);
      return slug;
    }
  }
  return undefined;
}
