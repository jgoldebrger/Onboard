import { db } from "@/lib/db";
import { normalizeDotNumber, normalizeMcNumber } from "@/lib/fmcsa/client";

export type DuplicateCheckResult = {
  duplicateDot: boolean;
  duplicateMc: boolean;
  duplicateEmail: boolean;
  conflictingApplicationIds: string[];
  details: string[];
};

export async function checkDuplicateCarrier(params: {
  applicationId: string;
  dotNumber?: string | null;
  mcNumber?: string | null;
  email: string;
}): Promise<DuplicateCheckResult> {
  const dot = params.dotNumber ? normalizeDotNumber(params.dotNumber) : null;
  const mc = params.mcNumber ? normalizeMcNumber(params.mcNumber) : null;
  const email = params.email.toLowerCase();

  const details: string[] = [];
  const conflictingApplicationIds = new Set<string>();

  if (dot) {
    const dotMatches = await db.governmentVerification.findMany({
      where: {
        dotNumber: dot,
        applicationId: { not: params.applicationId },
      },
      select: { applicationId: true },
    });
    for (const m of dotMatches) {
      conflictingApplicationIds.add(m.applicationId);
    }
    if (dotMatches.length > 0) {
      details.push(`DOT ${dot} already used by another application`);
    }
  }

  if (mc) {
    const mcMatches = await db.governmentVerification.findMany({
      where: {
        mcNumber: mc,
        applicationId: { not: params.applicationId },
      },
      select: { applicationId: true },
    });
    for (const m of mcMatches) {
      conflictingApplicationIds.add(m.applicationId);
    }
    if (mcMatches.length > 0) {
      details.push(`MC ${mc} already used by another application`);
    }
  }

  const emailUsers = await db.user.findMany({
    where: { email },
    select: { id: true },
  });
  if (emailUsers.length > 0) {
    const apps = await db.onboardingApplication.findMany({
      where: {
        userId: { in: emailUsers.map((u) => u.id) },
        id: { not: params.applicationId },
      },
      select: { id: true },
    });
    for (const a of apps) {
      conflictingApplicationIds.add(a.id);
    }
    if (apps.length > 0) {
      details.push("Email tied to another onboarding application");
    }
  }

  return {
    duplicateDot: details.some((d) => d.startsWith("DOT")),
    duplicateMc: details.some((d) => d.startsWith("MC")),
    duplicateEmail: details.some((d) => d.startsWith("Email")),
    conflictingApplicationIds: [...conflictingApplicationIds],
    details,
  };
}
