import { db } from "@/lib/db";
import { checkDuplicateCarrier } from "./duplicate-dot";
import { scoreContactDiscrepancies } from "./contact-discrepancy";
import { extractEinFromW9, validateEinFormat } from "./tin";
import { computeFraudScore, type FraudScoreResult } from "./score";
import { isDisposableEmail } from "./disposable-email";

function formatFmcsaAddress(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const addr = value as Record<string, unknown>;
    return [addr.street, addr.city, addr.state, addr.zip]
      .filter((p) => typeof p === "string" && p)
      .join(", ");
  }
  return null;
}

export async function assessApplicationFraud(
  applicationId: string,
): Promise<FraudScoreResult & { contactDiscrepancies: ReturnType<typeof scoreContactDiscrepancies> }> {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { email: true } },
      answers: { include: { question: true } },
      govVerifications: { orderBy: { verifiedAt: "desc" }, take: 1 },
      identityVerification: true,
      documents: {
        include: { documentType: true, review: true },
      },
    },
  });

  if (!application) {
    return {
      score: 0,
      level: "low",
      signals: [],
      blockOnboarding: false,
      contactDiscrepancies: {
        discrepancies: [],
        totalScore: 0,
        maxSeverity: null,
      },
    };
  }

  const answerMap = new Map(
    application.answers.map((a) => [a.question.key, a.value]),
  );
  const gov = application.govVerifications[0];
  const raw = gov?.rawResponse as { profile?: Record<string, unknown> } | null;
  const fmcsaProfile = {
    legalName:
      (raw?.profile?.legalName as string | undefined) ??
      gov?.companyName ??
      null,
    phone:
      (raw?.profile?.telephone as string | undefined) ??
      (raw?.profile?.phone as string | undefined) ??
      null,
    email: (raw?.profile?.email as string | undefined) ?? null,
    physicalAddress: formatFmcsaAddress(raw?.profile?.physicalAddress),
  };

  const duplicates = await checkDuplicateCarrier({
    applicationId,
    dotNumber: gov?.dotNumber ?? String(answerMap.get("dot_number") ?? ""),
    mcNumber: gov?.mcNumber ?? String(answerMap.get("mc_number") ?? ""),
    email: application.user.email,
  });

  const contactDiscrepancy = scoreContactDiscrepancies({
    application: {
      companyLegalName: String(answerMap.get("company_legal_name") ?? gov?.companyName ?? ""),
      phone: String(answerMap.get("phone") ?? answerMap.get("contact_phone") ?? ""),
      email: application.user.email,
      address: String(answerMap.get("address") ?? ""),
    },
    fmcsa: {
      legalName: fmcsaProfile.legalName,
      phone: fmcsaProfile.phone,
      email: fmcsaProfile.email,
      physicalAddress: fmcsaProfile.physicalAddress,
    },
  });

  const w9Doc = application.documents.find((d) => d.documentType?.key === "w9");
  const ein = extractEinFromW9(
    w9Doc?.review?.extractedData as Record<string, unknown> | undefined,
  );

  const identity = application.identityVerification;
  const fraud = computeFraudScore({
    duplicates,
    contactDiscrepancy,
    identityFailed: identity?.status === "FAILED" || identity?.match === false,
    identityLowConfidence:
      identity?.confidence != null && identity.confidence < 0.75,
    invalidEin: w9Doc != null && ein != null && !validateEinFormat(ein),
    disposableEmail: isDisposableEmail(application.user.email),
  });

  return { ...fraud, contactDiscrepancies: contactDiscrepancy };
}
