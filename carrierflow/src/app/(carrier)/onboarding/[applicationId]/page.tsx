import { redirect } from "next/navigation";
import { InterviewChat } from "@/components/carrier/interview-chat";
import { CarrierOnboardingShell } from "@/components/layout/carrier-onboarding-shell";
import { getSessionUser } from "@/lib/auth";
import { requireVerifiedEmail } from "@/lib/auth/guards";
import { db } from "@/lib/db";

type Props = { params: Promise<{ applicationId: string }> };

export default async function OnboardingInterviewPage({ params }: Props) {
  const { applicationId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  requireVerifiedEmail(user, `/onboarding/${applicationId}`);

  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, status: true },
  });

  if (!application || application.userId !== user.id) {
    redirect("/onboarding");
  }

  return (
    <CarrierOnboardingShell applicationId={applicationId}>
      <InterviewChat
        applicationId={applicationId}
        initialStatus={application.status}
      />
    </CarrierOnboardingShell>
  );
}
