import type { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeDotNumber, normalizeMcNumber } from "@/lib/fmcsa/client";

/** Applications still in the onboarding pipeline (not terminal). */
export const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "NEEDS_INFO",
];

export type ConflictingApplication = {
  id: string;
  status: ApplicationStatus;
  email: string;
  companyName: string | null;
};

export type DuplicateCheckResult = {
  duplicateDot: boolean;
  duplicateMc: boolean;
  duplicateEmail: boolean;
  conflictingApplicationIds: string[];
  conflictingApplications: ConflictingApplication[];
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

  async function addActiveConflicts(applicationIds: string[]) {
    if (applicationIds.length === 0) return;
    const active = await db.onboardingApplication.findMany({
      where: {
        id: { in: applicationIds },
        status: { in: ACTIVE_APPLICATION_STATUSES },
      },
      select: { id: true },
    });
    for (const a of active) {
      conflictingApplicationIds.add(a.id);
    }
  }

  if (dot) {
    const dotMatches = await db.governmentVerification.findMany({
      where: {
        dotNumber: dot,
        applicationId: { not: params.applicationId },
      },
      select: { applicationId: true },
    });
    const before = conflictingApplicationIds.size;
    await addActiveConflicts(dotMatches.map((m) => m.applicationId));
    if (conflictingApplicationIds.size > before) {
      details.push(`DOT ${dot} already used by another active application`);
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
    const before = conflictingApplicationIds.size;
    await addActiveConflicts(mcMatches.map((m) => m.applicationId));
    if (conflictingApplicationIds.size > before) {
      details.push(`MC ${mc} already used by another active application`);
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
        status: { in: ACTIVE_APPLICATION_STATUSES },
      },
      select: { id: true },
    });
    for (const a of apps) {
      conflictingApplicationIds.add(a.id);
    }
    if (apps.length > 0) {
      details.push("Email tied to another active onboarding application");
    }
  }

  const conflictingApplications = await loadConflictingApplications([
    ...conflictingApplicationIds,
  ]);

  return {
    duplicateDot: details.some((d) => d.startsWith("DOT")),
    duplicateMc: details.some((d) => d.startsWith("MC")),
    duplicateEmail: details.some((d) => d.startsWith("Email")),
    conflictingApplicationIds: [...conflictingApplicationIds],
    conflictingApplications,
    details,
  };
}

async function loadConflictingApplications(
  ids: string[],
): Promise<ConflictingApplication[]> {
  if (ids.length === 0) return [];
  const apps = await db.onboardingApplication.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      status: true,
      user: { select: { email: true, companyName: true } },
    },
  });
  return apps.map((a) => ({
    id: a.id,
    status: a.status,
    email: a.user.email,
    companyName: a.user.companyName,
  }));
}

/** Admin-facing duplicate warnings for a specific application. */
export async function getDuplicateWarnings(applicationId: string) {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { email: true } },
      govVerifications: { orderBy: { verifiedAt: "desc" }, take: 1 },
    },
  });
  if (!application) return null;

  const latestGov = application.govVerifications[0];
  return checkDuplicateCarrier({
    applicationId,
    dotNumber: latestGov?.dotNumber,
    mcNumber: latestGov?.mcNumber,
    email: application.user.email,
  });
}
