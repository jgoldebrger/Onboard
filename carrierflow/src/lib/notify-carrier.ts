import { applicationStatusEmail } from "@/lib/email";
import { db } from "@/lib/db";

export async function notifyCarrierOfStatusChange(
  applicationId: string,
  status: string,
  notes?: string,
) {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!application?.user?.email) return;

  const company =
    application.user.companyName ??
    application.detectedType ??
    "your carrier application";

  await applicationStatusEmail({
    to: application.user.email,
    companyLabel: company,
    status,
    notes,
  });
}
