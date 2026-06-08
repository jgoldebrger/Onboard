/** Turn `profile.legalName` or `carrierOperation.carrierOperationDesc` into readable labels. */
export function formatSaferFieldLabel(key: string): string {
  const segment = key.split(/[.[\]]/).filter(Boolean).pop() ?? key;
  return segment
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function formatSaferFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value === "Y") return "Yes";
    if (value === "N") return "No";
    if (value === "S") return "Satisfactory";
    if (value === "U") return "Unsatisfactory";
    if (value === "C") return "Conditional";
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value.map((v) => formatSaferFieldValue(v)).join(", ");
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const parts = Object.entries(rec)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${formatSaferFieldLabel(k)}: ${formatSaferFieldValue(v)}`);
    return parts.length ? parts.join(" · ") : "—";
  }
  return String(value);
}

export type CsaBasicRow = {
  name: string;
  measure: string;
  percentile: string;
  violations: string;
  threshold: string;
  runDate: string;
};

/** Render CSA BASIC scores from FMCSA /basics endpoint content array. */
export function parseCsaBasicsRows(basicsEnvelope: unknown): CsaBasicRow[] {
  if (!basicsEnvelope || typeof basicsEnvelope !== "object") return [];
  const content = (basicsEnvelope as { content?: unknown }).content;
  if (!Array.isArray(content)) return [];

  const rows: CsaBasicRow[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const basic = (item as { basic?: Record<string, unknown> }).basic;
    if (!basic) continue;
    const basicsType = basic.basicsType as Record<string, unknown> | undefined;
    rows.push({
      name: String(
        basicsType?.basicsShortDesc ?? basicsType?.basicsCode ?? "BASIC",
      ),
      measure: String(basic.measureValue ?? "—"),
      percentile: String(basic.basicsPercentile ?? "—"),
      violations: String(basic.totalViolation ?? "—"),
      threshold: String(basic.basicsViolationThreshold ?? "—"),
      runDate: basic.basicsRunDate
        ? new Date(String(basic.basicsRunDate)).toLocaleDateString()
        : "—",
    });
  }
  return rows;
}
