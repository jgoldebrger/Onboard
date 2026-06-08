import { NextResponse } from "next/server";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireVerificationAccess(applicationId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true },
  });

  if (!application) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  if (
    application.userId !== user.id &&
    !hasPermission(user.role, "applications:read")
  ) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, application };
}

export function answerString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "value" in value) {
    return answerString((value as { value: unknown }).value);
  }
  return null;
}

export async function loadApplicationVerificationFields(applicationId: string) {
  const answers = await db.applicationAnswer.findMany({
    where: { applicationId },
    include: { question: { select: { key: true } } },
  });

  const fields = {
    companyLegalName: null as string | null,
    dotNumber: null as string | null,
    mcNumber: null as string | null,
  };

  for (const answer of answers) {
    const val = answerString(answer.value);
    if (answer.question.key === "company_legal_name") fields.companyLegalName = val;
    if (answer.question.key === "dot_number") fields.dotNumber = val;
    if (answer.question.key === "mc_number") fields.mcNumber = val;
  }

  return fields;
}

export function formatVerificationResponse(
  record: {
    id: string;
    dotNumber: string | null;
    mcNumber: string | null;
    companyName: string | null;
    dotStatus: string | null;
    mcStatus: string | null;
    authorityStatus: string | null;
    matchScore: number | null;
    riskFlags: string[];
    status: string;
    verifiedAt: Date;
    provider: string;
  },
  compare?: {
    matches: boolean;
    dotStatus: string;
    mcStatus: string;
    riskFlags: string[];
    authorityStatus?: string;
    matchScore?: number;
  },
) {
  return {
    id: record.id,
    provider: record.provider,
    dotNumber: record.dotNumber,
    mcNumber: record.mcNumber,
    companyName: record.companyName,
    dotStatus: compare?.dotStatus ?? record.dotStatus,
    mcStatus: compare?.mcStatus ?? record.mcStatus,
    authorityStatus: compare?.authorityStatus ?? record.authorityStatus,
    matchScore: compare?.matchScore ?? record.matchScore,
    matches:
      compare?.matches ??
      (record.status === "PASSED" && record.riskFlags.length === 0),
    riskFlags: compare?.riskFlags ?? record.riskFlags,
    status: record.status,
    verifiedAt: record.verifiedAt.toISOString(),
  };
}
