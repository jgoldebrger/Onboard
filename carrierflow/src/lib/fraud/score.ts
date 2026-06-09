import type { ContactDiscrepancyResult } from "./contact-discrepancy";
import type { DuplicateCheckResult } from "./duplicate-dot";

export type FraudSignal = {
  key: string;
  label: string;
  points: number;
  severity: "low" | "medium" | "high";
};

export type FraudScoreResult = {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  signals: FraudSignal[];
  blockOnboarding: boolean;
};

const BLOCK_THRESHOLD = Number(process.env.FRAUD_BLOCK_THRESHOLD ?? 60);

export function computeFraudScore(input: {
  duplicates: DuplicateCheckResult;
  contactDiscrepancy: ContactDiscrepancyResult;
  identityFailed?: boolean;
  identityLowConfidence?: boolean;
  invalidEin?: boolean;
  disposableEmail?: boolean;
  voipPhone?: boolean;
  disposablePhone?: boolean;
  tinMismatch?: boolean;
}): FraudScoreResult {
  const signals: FraudSignal[] = [];

  if (input.duplicates.duplicateDot) {
    signals.push({
      key: "duplicate_dot",
      label: "DOT number already on file",
      points: 40,
      severity: "high",
    });
  }
  if (input.duplicates.duplicateMc) {
    signals.push({
      key: "duplicate_mc",
      label: "MC number already on file",
      points: 35,
      severity: "high",
    });
  }
  if (input.duplicates.duplicateEmail) {
    signals.push({
      key: "duplicate_email",
      label: "Email tied to another application",
      points: 20,
      severity: "medium",
    });
  }

  if (input.contactDiscrepancy.totalScore > 0) {
    signals.push({
      key: "contact_mismatch",
      label: `Contact discrepancy (${input.contactDiscrepancy.discrepancies.length} fields)`,
      points: Math.min(input.contactDiscrepancy.totalScore, 40),
      severity: input.contactDiscrepancy.maxSeverity ?? "medium",
    });
  }

  if (input.identityFailed) {
    signals.push({
      key: "identity_failed",
      label: "Identity verification failed",
      points: 30,
      severity: "high",
    });
  }
  if (input.identityLowConfidence) {
    signals.push({
      key: "identity_low_confidence",
      label: "Low identity match confidence",
      points: 15,
      severity: "medium",
    });
  }
  if (input.invalidEin) {
    signals.push({
      key: "invalid_ein",
      label: "Invalid W-9 EIN format",
      points: 20,
      severity: "medium",
    });
  }
  if (input.disposableEmail) {
    signals.push({
      key: "disposable_email",
      label: "Disposable email domain",
      points: 25,
      severity: "high",
    });
  }
  if (input.voipPhone) {
    signals.push({
      key: "voip_phone",
      label: "VoIP phone number detected",
      points: 20,
      severity: "medium",
    });
  }
  if (input.disposablePhone) {
    signals.push({
      key: "disposable_phone",
      label: "Disposable or burner phone line",
      points: 30,
      severity: "high",
    });
  }
  if (input.tinMismatch) {
    signals.push({
      key: "tin_mismatch",
      label: "TIN does not match legal name",
      points: 35,
      severity: "high",
    });
  }

  const score = signals.reduce((sum, s) => sum + s.points, 0);
  const level =
    score >= 80
      ? "critical"
      : score >= 50
        ? "high"
        : score >= 25
          ? "medium"
          : "low";

  return {
    score,
    level,
    signals,
    blockOnboarding: score >= BLOCK_THRESHOLD,
  };
}
