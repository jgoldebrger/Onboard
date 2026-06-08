/** Strip non-digits from DOT / MC identifiers. */
export function normalizeDotNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/** Normalize MC to digits; FMCSA docket lookups often use numeric portion only. */
export function normalizeMcNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const stripped = value.trim().replace(/^mc[-\s]*/i, "");
  const digits = stripped.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function normalizeCompanyName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export function companyNamesMatch(a: string, b: string): boolean {
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}
