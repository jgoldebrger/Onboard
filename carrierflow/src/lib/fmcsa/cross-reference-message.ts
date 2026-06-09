import type { FmcsaSyncResult } from "./persist-for-application";
import { buildStructuredCrossReferenceAlerts } from "./cross-reference";

export function buildDotFirstPrompt(): string {
  return (
    "Let's start by verifying your carrier in the FMCSA registry (SAFER). " +
    "What is your U.S. DOT number? (1–8 digits, numbers only.)"
  );
}

/** User-facing summary after FMCSA lookup and cross-reference. */
export function buildFmcsaCrossReferenceMessage(
  sync: FmcsaSyncResult | null,
  dotInput: string,
): string {
  if (!sync) {
    return (
      `We couldn't look up DOT ${dotInput} in FMCSA right now. ` +
      "Please check the number and try again, or continue and we'll retry later."
    );
  }

  if (!sync.found) {
    return (
      `DOT ${dotInput} was not found in the FMCSA registry. ` +
      "Double-check the number and enter it again."
    );
  }

  const lines: string[] = [
    `Found your carrier in FMCSA for DOT ${dotInput}:`,
  ];

  if (sync.legalName) {
    lines.push(`• Legal name: ${sync.legalName}`);
  }
  if (sync.mcNumber) {
    lines.push(`• MC number: ${sync.mcNumber}`);
  }
  lines.push(`• DOT operating status: ${sync.dotStatus.replace(/_/g, " ")}`);
  if (sync.authorityStatus && sync.authorityStatus !== "UNKNOWN") {
    lines.push(`• Authority: ${sync.authorityStatus.replace(/_/g, " ")}`);
  }

  if (sync.prefilledAnswerKeys.length > 0) {
    const labels = sync.prefilledAnswerKeys.map(humanizeQuestionKey);
    lines.push(`• Pre-filled from registry: ${labels.join(", ")}`);
  }

  const matchPct = Math.round(sync.matchScore * 100);
  lines.push(`• Cross-reference match: ${matchPct}%`);

  if (sync.riskFlags.length > 0) {
    lines.push(
      `• Flags: ${sync.riskFlags.map((f) => f.replace(/_/g, " ")).join(" · ")}`,
    );
  }

  if (sync.status === "FAILED") {
    lines.push(
      "Some details don't match the registry yet — we'll confirm the rest as you continue.",
    );
  } else if (sync.status === "MANUAL_REVIEW") {
    lines.push("A reviewer may need to confirm a few details against the registry.");
  }

  return lines.join("\n");
}

/** Structured alerts for fraud scoring and admin review. */
export function getFmcsaCrossReferenceAlerts(
  sync: FmcsaSyncResult | null,
  application: {
    companyLegalName?: string | null;
    phone?: string | null;
    email?: string | null;
  },
) {
  return buildStructuredCrossReferenceAlerts(sync, application);
}

function humanizeQuestionKey(key: string): string {
  return key.replace(/_/g, " ");
}
