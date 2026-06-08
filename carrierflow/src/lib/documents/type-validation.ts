/** Normalize document type slugs for comparison (DB keys vs model output). */
export function normalizeDocumentTypeKey(key: string | null | undefined): string {
  if (!key) return "unknown";
  const raw = key.toLowerCase().trim().replace(/_/g, "-");
  if (raw === "w-9" || raw === "w9" || raw.includes("w-9") || raw === "form-w9") {
    return "w9";
  }
  if (
    raw === "coi" ||
    raw.includes("certificate-of-insurance") ||
    (raw.includes("certificate") && raw.includes("insurance"))
  ) {
    return "coi";
  }
  if (raw.includes("broker") && raw.includes("authority")) {
    return "broker-authority";
  }
  if (raw.includes("operating") && raw.includes("authority")) {
    return "operating-authority";
  }
  return raw;
}

type TypeSignature = {
  /** At least this many `signals` must appear in extracted text. */
  minSignals: number;
  signals: string[];
  /** If any appear, document is likely a different type. */
  antiSignals?: string[];
};

const SIGNATURES: Record<string, TypeSignature> = {
  w9: {
    minSignals: 2,
    signals: [
      "form w-9",
      "form w9",
      "w-9",
      "request for taxpayer",
      "taxpayer identification",
      "employer identification number",
      "ein",
      "irs",
      "federal tax classification",
    ],
    antiSignals: [
      "certificate of insurance",
      "acord 25",
      "policy number",
      "certificate holder",
      "broker authority",
    ],
  },
  coi: {
    minSignals: 2,
    signals: [
      "certificate of insurance",
      "acord 25",
      "policy number",
      "insured",
      "certificate holder",
      "liability",
      "expiration date",
      "insurer",
    ],
    antiSignals: [
      "form w-9",
      "request for taxpayer",
      "taxpayer identification",
      "federal tax classification",
    ],
  },
  "broker-authority": {
    minSignals: 2,
    signals: [
      "broker",
      "authority",
      "motor carrier",
      "fmcsa",
      "mc number",
      "dot",
      "operating authority",
    ],
    antiSignals: ["form w-9", "certificate of insurance", "acord 25"],
  },
  "operating-authority": {
    minSignals: 2,
    signals: [
      "operating authority",
      "motor carrier",
      "fmcsa",
      "mc number",
      "dot",
      "carrier",
    ],
    antiSignals: ["form w-9", "certificate of insurance"],
  },
};

function countSignals(haystack: string, phrases: string[]): number {
  let count = 0;
  for (const phrase of phrases) {
    if (haystack.includes(phrase)) count += 1;
  }
  return count;
}

export type ContentValidationResult = {
  matches: boolean;
  expectedKey: string;
  signalCount: number;
  antiSignalHit: string | null;
  reason: string | null;
};

/**
 * Heuristic check that extracted text looks like the expected document type.
 * Used together with the review agent — not a substitute for human review on edge cases.
 */
export function validateDocumentContent(params: {
  expectedTypeKey: string;
  extractedText: string;
  fileName?: string;
}): ContentValidationResult {
  const expectedKey = normalizeDocumentTypeKey(params.expectedTypeKey);
  const signature = SIGNATURES[expectedKey];
  const haystack = `${params.fileName ?? ""}\n${params.extractedText}`
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (!signature) {
    return {
      matches: true,
      expectedKey,
      signalCount: 0,
      antiSignalHit: null,
      reason: null,
    };
  }

  if (haystack.trim().length < 40) {
    return {
      matches: false,
      expectedKey,
      signalCount: 0,
      antiSignalHit: null,
      reason:
        "Could not read enough text from this file to verify the document type. Upload a clear PDF or photo.",
    };
  }

  const anti = signature.antiSignals ?? [];
  for (const phrase of anti) {
    if (haystack.includes(phrase)) {
      return {
        matches: false,
        expectedKey,
        signalCount: 0,
        antiSignalHit: phrase,
        reason: `This file looks like a different document (found "${phrase}"), not the requested ${expectedKey}.`,
      };
    }
  }

  const signalCount = countSignals(haystack, signature.signals);
  if (signalCount < signature.minSignals) {
    return {
      matches: false,
      expectedKey,
      signalCount,
      antiSignalHit: null,
      reason: `This file does not appear to be a valid ${expectedKey.replace(/-/g, " ")}. Upload the correct document.`,
    };
  }

  return {
    matches: true,
    expectedKey,
    signalCount,
    antiSignalHit: null,
    reason: null,
  };
}
