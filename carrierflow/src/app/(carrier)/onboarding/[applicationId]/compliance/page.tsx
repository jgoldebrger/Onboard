import { redirect } from "next/navigation";
import { CoiRenewalUpload } from "@/components/carrier/coi-renewal-upload";
import { CarrierOnboardingShell } from "@/components/layout/carrier-onboarding-shell";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Props = { params: Promise<{ applicationId: string }> };

export default async function CoiCompliancePage({ params }: Props) {
  const { applicationId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      userId: true,
      status: true,
      carrierProfile: {
        select: {
          monitoredDocuments: {
            where: { documentTypeKey: "coi" },
            take: 1,
          },
        },
      },
    },
  });

  if (!application || application.userId !== user.id) {
    redirect("/onboarding");
  }
  if (application.status !== "APPROVED" || !application.carrierProfile) {
    redirect(`/onboarding/${applicationId}`);
  }

  const monitoredCoi = application.carrierProfile.monitoredDocuments[0] ?? null;

  return (
    <CarrierOnboardingShell applicationId={applicationId} showComplianceNav>
      <CoiRenewalUpload
        applicationId={applicationId}
        monitoredCoi={
          monitoredCoi
            ? {
                policyNumber: monitoredCoi.policyNumber,
                expirationDate: monitoredCoi.expirationDate?.toISOString() ?? null,
                effectiveDate: monitoredCoi.effectiveDate?.toISOString() ?? null,
              }
            : null
        }
      />
    </CarrierOnboardingShell>
  );
}
