import type { QualificationStatus } from "@prisma/client";
import { parseCsaBasicsRows } from "@/lib/fmcsa/display-format";
import {
  deriveAuthorityStatus,
  deriveOperationalStatus,
  lookupCarrier,
} from "@/lib/fmcsa/client";
import { evaluateRules, buildEvaluationContext } from "@/lib/rules";
import type {
  ComplianceCheckResult,
  DocumentExpiryFlag,
  FmcsaSnapshotData,
} from "./types";

const CSA_THRESHOLD = Number(process.env.COMPLIANCE_CSA_THRESHOLD ?? 75);
const EXPIRY_WARN_DAYS = [30, 14, 7];

function worstStatus(
  current: QualificationStatus,
  next: QualificationStatus,
): QualificationStatus {
  const order: QualificationStatus[] = [
    "COMPLIANT",
    "ATTENTION",
    "NON_COMPLIANT",
    "SUSPENDED",
  ];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function authorityIsInactive(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return (
    s.includes("INACTIVE") ||
    s.includes("REVOKED") ||
    s.includes("NOT_AUTHORIZED") ||
    s === "OUT_OF_SERVICE"
  );
}

function dotIsInactive(dotStatus: string | null | undefined): boolean {
  if (!dotStatus) return false;
  const s = dotStatus.toUpperCase();
  return s.includes("NOT_AUTHORIZED") || s.includes("OUT_OF_SERVICE");
}

export async function evaluateFmcsaCompliance(params: {
  dotNumber: string | null;
  previousSnapshot?: FmcsaSnapshotData | null;
}): Promise<{
  fmcsaData: FmcsaSnapshotData | null;
  derivedFlags: string[];
  alerts: ComplianceCheckResult["alertsToCreate"];
  qualificationStatus: QualificationStatus;
}> {
  const derivedFlags: string[] = [];
  const alerts: ComplianceCheckResult["alertsToCreate"] = [];
  let qualificationStatus: QualificationStatus = "COMPLIANT";

  if (!params.dotNumber) {
    return { fmcsaData: null, derivedFlags, alerts, qualificationStatus };
  }

  let fmcsa;
  try {
    fmcsa = await lookupCarrier({ dotNumber: params.dotNumber });
  } catch {
    derivedFlags.push("fmcsa_lookup_failed");
    qualificationStatus = worstStatus(qualificationStatus, "ATTENTION");
    return { fmcsaData: null, derivedFlags, alerts, qualificationStatus };
  }

  const { dotStatus, mcStatus } = deriveOperationalStatus(fmcsa.carrier);
  const authorityStatus = deriveAuthorityStatus(fmcsa.authority);
  const csaRows = parseCsaBasicsRows(fmcsa.basics);
  const csaScores: Record<string, number> = {};
  for (const row of csaRows) {
    const pct = Number(row.percentile);
    if (!Number.isNaN(pct)) {
      csaScores[row.name] = pct;
    }
  }

  const fmcsaData: FmcsaSnapshotData = {
    dotNumber: fmcsa.resolvedDotNumber,
    mcNumber: fmcsa.resolvedMcNumber,
    dotStatus,
    mcStatus,
    authorityStatus,
    riskFlags: [],
    csaScores,
  };

  if (dotIsInactive(dotStatus)) {
    derivedFlags.push("dot_inactive");
    qualificationStatus = worstStatus(qualificationStatus, "NON_COMPLIANT");
    alerts.push({
      type: "FMCSA_DATA_CHANGED",
      severity: "high",
      title: "DOT operating status inactive",
      message: `DOT status changed to ${dotStatus}`,
      metadata: { dotStatus },
    });
  }

  if (authorityIsInactive(authorityStatus)) {
    derivedFlags.push("authority_inactive");
    qualificationStatus = worstStatus(qualificationStatus, "NON_COMPLIANT");
    alerts.push({
      type: "AUTHORITY_INACTIVE",
      severity: "high",
      title: "Operating authority inactive",
      message: `Authority status: ${authorityStatus}`,
      metadata: { authorityStatus },
    });
  }

  for (const [basic, score] of Object.entries(csaScores)) {
    if (score >= CSA_THRESHOLD) {
      derivedFlags.push(`csa_${basic}_high`);
      qualificationStatus = worstStatus(qualificationStatus, "ATTENTION");
      alerts.push({
        type: "CSA_THRESHOLD",
        severity: "medium",
        title: `CSA ${basic} above threshold`,
        message: `${basic} percentile is ${score}% (threshold ${CSA_THRESHOLD}%)`,
        metadata: { basic, score, threshold: CSA_THRESHOLD },
      });
    }
  }

  if (params.previousSnapshot) {
    const prev = params.previousSnapshot;
    if (prev.dotStatus && prev.dotStatus !== dotStatus) {
      derivedFlags.push("dot_status_changed");
      alerts.push({
        type: "FMCSA_DATA_CHANGED",
        severity: "medium",
        title: "DOT status changed",
        message: `${prev.dotStatus} → ${dotStatus}`,
        metadata: { from: prev.dotStatus, to: dotStatus },
      });
      qualificationStatus = worstStatus(qualificationStatus, "ATTENTION");
    }
    if (
      prev.authorityStatus &&
      prev.authorityStatus !== authorityStatus
    ) {
      derivedFlags.push("authority_status_changed");
      alerts.push({
        type: "FMCSA_DATA_CHANGED",
        severity: "medium",
        title: "Authority status changed",
        message: `${prev.authorityStatus} → ${authorityStatus}`,
        metadata: { from: prev.authorityStatus, to: authorityStatus },
      });
      qualificationStatus = worstStatus(qualificationStatus, "ATTENTION");
    }
  }

  return { fmcsaData, derivedFlags, alerts, qualificationStatus };
}

export function evaluateDocumentExpiry(monitoredDocs: {
  documentTypeKey: string;
  documentId: string | null;
  expirationDate: Date | null;
}[]): {
  documentFlags: DocumentExpiryFlag[];
  alerts: ComplianceCheckResult["alertsToCreate"];
  qualificationStatus: QualificationStatus;
} {
  const documentFlags: DocumentExpiryFlag[] = [];
  const alerts: ComplianceCheckResult["alertsToCreate"] = [];
  let qualificationStatus: QualificationStatus = "COMPLIANT";
  const now = new Date();

  for (const doc of monitoredDocs) {
    if (!doc.expirationDate) continue;
    const daysUntil = Math.ceil(
      (doc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    documentFlags.push({
      documentTypeKey: doc.documentTypeKey,
      documentId: doc.documentId,
      expirationDate: doc.expirationDate.toISOString(),
      daysUntilExpiry: daysUntil,
    });

    if (daysUntil < 0) {
      qualificationStatus = worstStatus(qualificationStatus, "NON_COMPLIANT");
      alerts.push({
        type: "DOC_EXPIRED",
        severity: "high",
        title: `${doc.documentTypeKey.toUpperCase()} expired`,
        message: `Expired ${Math.abs(daysUntil)} days ago`,
        metadata: { documentTypeKey: doc.documentTypeKey, daysUntil },
      });
    } else if (EXPIRY_WARN_DAYS.includes(daysUntil)) {
      qualificationStatus = worstStatus(qualificationStatus, "ATTENTION");
      alerts.push({
        type: "INSURANCE_EXPIRING",
        severity: daysUntil <= 7 ? "high" : "medium",
        title: `${doc.documentTypeKey.toUpperCase()} expiring in ${daysUntil} days`,
        message: `Expiration date: ${doc.expirationDate.toLocaleDateString()}`,
        metadata: { documentTypeKey: doc.documentTypeKey, daysUntil },
      });
    }
  }

  return { documentFlags, alerts, qualificationStatus };
}

export async function evaluateRulesCompliance(applicationId: string): Promise<{
  ruleResults: Record<string, unknown>;
  alerts: ComplianceCheckResult["alertsToCreate"];
  qualificationStatus: QualificationStatus;
}> {
  const context = await buildEvaluationContext(applicationId);
  const result = await evaluateRules(context);
  const alerts: ComplianceCheckResult["alertsToCreate"] = [];
  let qualificationStatus: QualificationStatus = "COMPLIANT";

  if (result.blocked) {
    qualificationStatus = "NON_COMPLIANT";
    for (const reason of result.blockReasons) {
      alerts.push({
        type: "RULE_VIOLATION",
        severity: "high",
        title: "Rule blocks qualification",
        message: reason,
      });
    }
  }

  return {
    ruleResults: {
      blocked: result.blocked,
      blockReasons: result.blockReasons,
      requiredQuestionIds: result.requiredQuestionIds,
      requiredDocumentTypeIds: result.requiredDocumentTypeIds,
      riskAdditions: result.riskAdditions,
    },
    alerts,
    qualificationStatus,
  };
}

export function mergeQualification(
  statuses: QualificationStatus[],
): QualificationStatus {
  return statuses.reduce(
    (acc, s) => worstStatus(acc, s),
    "COMPLIANT" as QualificationStatus,
  );
}
