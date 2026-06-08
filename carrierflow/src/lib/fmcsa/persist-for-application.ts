import type { VerificationStatus } from "@prisma/client";
import { loadApplicationVerificationFields } from "@/app/api/verification/_utils";
import {
  runVerificationCompare,
  verificationStatusFromCompare,
} from "@/lib/agents/verification";
import { db } from "@/lib/db";
import {
  carrierLegalName,
  deriveAuthorityStatus,
  deriveOperationalStatus,
  extractCarrierProfile,
  lookupCarrier,
} from "@/lib/fmcsa/client";
import { buildFmcsaRawResponse } from "@/lib/fmcsa/build-raw-response";
import { normalizeDotNumber } from "@/lib/fmcsa/normalize";
import {
  saveApplicationAnswer,
  saveApplicationAnswerIfEmpty,
} from "@/lib/interview/save-answer";

export type FmcsaSyncResult = {
  verificationId: string;
  status: VerificationStatus;
  companyName: string | null;
  legalName: string | null;
  mcNumber: string | null;
  authorityStatus: string;
  matchScore: number;
  riskFlags: string[];
  prefilledAnswerKeys: string[];
  dotStatus: string;
  mcStatus: string;
  found: boolean;
};

/**
 * Look up DOT in FMCSA QCMobile (official SAFER registry API), persist a
 * GovernmentVerification row with full raw JSON, and pre-fill empty application answers.
 */
export async function syncFmcsaFromDotAnswer(
  applicationId: string,
  dotInput: string,
): Promise<FmcsaSyncResult | null> {
  const dot = normalizeDotNumber(dotInput);
  if (!dot) return null;

  let fmcsa;
  try {
    fmcsa = await lookupCarrier({ dotNumber: dot });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("FMCSA sync failed for application", applicationId, err);
    }
    return null;
  }

  const profile = extractCarrierProfile(fmcsa);
  const appFields = await loadApplicationVerificationFields(applicationId);
  const companyName =
    appFields.companyLegalName ??
    profile.legalName ??
    profile.dbaName ??
    carrierLegalName(fmcsa.carrier);

  const compare = await runVerificationCompare({
    application: {
      companyLegalName: companyName,
      dotNumber: dot,
      mcNumber: profile.mcFormatted ?? appFields.mcNumber,
    },
    fmcsa,
    companyNameOverride: companyName ?? undefined,
  });

  const status = verificationStatusFromCompare(compare);
  const { dotStatus, mcStatus } = deriveOperationalStatus(fmcsa.carrier);
  const authorityStatus = deriveAuthorityStatus(fmcsa.authority);

  const record = await db.governmentVerification.create({
    data: {
      applicationId,
      dotNumber: fmcsa.resolvedDotNumber ?? dot,
      mcNumber: fmcsa.resolvedMcNumber ?? profile.mcNumber,
      companyName: companyName ?? carrierLegalName(fmcsa.carrier),
      dotStatus: compare.dotStatus ?? dotStatus,
      mcStatus: compare.mcStatus ?? mcStatus,
      authorityStatus: compare.authorityStatus ?? authorityStatus,
      matchScore: compare.matchScore,
      riskFlags: compare.riskFlags,
      status,
      provider: "fmcsa_qcmobile",
      rawResponse: buildFmcsaRawResponse(fmcsa, {
        profile,
        source: "interview_dot_answer",
      }),
    },
  });

  const prefilledAnswerKeys: string[] = [];

  if (profile.legalName) {
    const r = await saveApplicationAnswerIfEmpty(
      applicationId,
      "company_legal_name",
      profile.legalName,
      "fmcsa",
    );
    if (r.saved.length) prefilledAnswerKeys.push(...r.saved);
  }

  if (profile.mcFormatted) {
    const r = await saveApplicationAnswerIfEmpty(
      applicationId,
      "mc_number",
      profile.mcFormatted,
      "fmcsa",
    );
    if (r.saved.length) prefilledAnswerKeys.push(...r.saved);
  }

  if (profile.totalPowerUnits != null) {
    const r = await saveApplicationAnswerIfEmpty(
      applicationId,
      "fleet_size",
      profile.totalPowerUnits,
      "fmcsa",
    );
    if (r.saved.length) prefilledAnswerKeys.push(...r.saved);
  }

  const resolvedDot = fmcsa.resolvedDotNumber ?? profile.dotNumber;
  if (resolvedDot && resolvedDot !== dot) {
    await saveApplicationAnswer(applicationId, "dot_number", resolvedDot, "fmcsa");
  }

  return {
    verificationId: record.id,
    status,
    companyName: record.companyName,
    legalName: profile.legalName ?? carrierLegalName(fmcsa.carrier),
    mcNumber:
      profile.mcFormatted ??
      (fmcsa.resolvedMcNumber ? `MC-${fmcsa.resolvedMcNumber}` : null),
    authorityStatus: record.authorityStatus ?? authorityStatus,
    matchScore: compare.matchScore,
    riskFlags: compare.riskFlags,
    prefilledAnswerKeys,
    dotStatus: record.dotStatus ?? dotStatus,
    mcStatus: record.mcStatus ?? mcStatus,
    found: Boolean(profile.rawCarrier),
  };
}
