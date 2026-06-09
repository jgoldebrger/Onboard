"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function OnboardingNav({
  applicationId,
  showComplianceNav = false,
}: {
  applicationId: string;
  showComplianceNav?: boolean;
}) {
  const pathname = usePathname();
  const chatHref = `/onboarding/${applicationId}`;
  const complianceHref = `/onboarding/${applicationId}/compliance`;
  const onChat =
    pathname === chatHref || pathname.startsWith(`${chatHref}/identity`);
  const onCompliance = pathname.startsWith(complianceHref);

  return (
    <nav aria-label="Carrier navigation" className="space-y-2">
      <Link
        href={chatHref}
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
          onChat && "bg-accent text-accent-foreground",
          !onChat && "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
            onChat && "border-primary bg-primary text-primary-foreground",
            !onChat && "border-border bg-card",
          )}
        >
          1
        </span>
        <span className="text-sm font-medium">Onboarding chat</span>
      </Link>
      {showComplianceNav ? (
        <Link
          href={complianceHref}
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
            onCompliance && "bg-accent text-accent-foreground",
            !onCompliance &&
              "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              onCompliance && "border-primary bg-primary text-primary-foreground",
              !onCompliance && "border-border bg-card",
            )}
          >
            2
          </span>
          <span className="text-sm font-medium">COI renewal</span>
        </Link>
      ) : null}
      <p className="px-1 text-xs text-muted-foreground">
        {showComplianceNav
          ? "Renew your certificate of insurance without re-onboarding."
          : "Questions, documents, and identity verification — all in one conversation."}
      </p>
    </nav>
  );
}
