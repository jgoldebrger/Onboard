import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ComplianceEntryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const application = await db.onboardingApplication.findFirst({
    where: {
      userId: user.id,
      status: "APPROVED",
      carrierProfile: { isNot: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!application) {
    redirect("/onboarding");
  }

  redirect(`/onboarding/${application.id}/compliance`);
}
