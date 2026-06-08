import { OnboardingNav } from "@/components/carrier/onboarding-nav";

export function CarrierOnboardingShell({
  applicationId,
  children,
}: {
  applicationId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <OnboardingNav applicationId={applicationId} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
