export type ContactDiscrepancy = {
  field: string;
  applicationValue: string | null;
  fmcsaValue: string | null;
  severity: "low" | "medium" | "high";
  score: number;
};

export type ContactDiscrepancyResult = {
  discrepancies: ContactDiscrepancy[];
  totalScore: number;
  maxSeverity: "low" | "medium" | "high" | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function compareStrings(
  field: string,
  appVal: string | null | undefined,
  fmcsaVal: string | null | undefined,
): ContactDiscrepancy | null {
  const a = normalize(appVal);
  const f = normalize(fmcsaVal);
  if (!a || !f) return null;
  if (a === f) return null;

  const digitsOnly = (s: string) => s.replace(/\D/g, "");
  if (digitsOnly(a) === digitsOnly(f) && digitsOnly(a).length >= 7) {
    return { field, applicationValue: appVal ?? null, fmcsaValue: fmcsaVal ?? null, severity: "low", score: 5 };
  }

  if (field === "phone") {
    return { field, applicationValue: appVal ?? null, fmcsaValue: fmcsaVal ?? null, severity: "medium", score: 15 };
  }

  if (field === "email") {
    return { field, applicationValue: appVal ?? null, fmcsaValue: fmcsaVal ?? null, severity: "high", score: 25 };
  }

  return { field, applicationValue: appVal ?? null, fmcsaValue: fmcsaVal ?? null, severity: "medium", score: 10 };
}

export function scoreContactDiscrepancies(params: {
  application: {
    companyLegalName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  fmcsa: {
    legalName?: string | null;
    phone?: string | null;
    email?: string | null;
    physicalAddress?: string | null;
  };
}): ContactDiscrepancyResult {
  const checks = [
    compareStrings("company_legal_name", params.application.companyLegalName, params.fmcsa.legalName),
    compareStrings("phone", params.application.phone, params.fmcsa.phone),
    compareStrings("email", params.application.email, params.fmcsa.email),
    compareStrings("address", params.application.address, params.fmcsa.physicalAddress),
  ].filter((c): c is ContactDiscrepancy => c != null);

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const severities = checks.map((c) => c.severity);
  const maxSeverity = severities.includes("high")
    ? "high"
    : severities.includes("medium")
      ? "medium"
      : severities.includes("low")
        ? "low"
        : null;

  return { discrepancies: checks, totalScore, maxSeverity };
}
