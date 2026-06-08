"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function OnboardingNav({ applicationId }: { applicationId: string }) {
  const pathname = usePathname();
  const href = `/onboarding/${applicationId}`;
  const isActive = pathname.includes(`/onboarding/${applicationId}`);

  return (
    <nav aria-label="Onboarding progress" className="space-y-2">
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
          isActive && "bg-accent text-accent-foreground",
          !isActive && "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
            isActive && "border-primary bg-primary text-primary-foreground",
            !isActive && "border-border bg-card",
          )}
        >
          1
        </span>
        <span className="text-sm font-medium">Onboarding chat</span>
      </Link>
      <p className="text-xs text-muted-foreground px-1">
        Questions, documents, and identity verification — all in one conversation.
      </p>
    </nav>
  );
}
