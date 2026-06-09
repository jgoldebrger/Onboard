const EIN_PATTERN = /^\d{2}-?\d{7}$/;

export function normalizeEin(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function validateEinFormat(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeEin(value);
  if (!normalized) return false;
  return EIN_PATTERN.test(normalized);
}

export function extractEinFromW9(
  extractedData: Record<string, unknown> | null | undefined,
): string | null {
  if (!extractedData) return null;
  const fields = (extractedData.fields ?? extractedData) as Record<
    string,
    unknown
  >;
  const candidates = [
    fields.ein,
    fields.tin,
    fields.taxId,
    fields.employerIdentificationNumber,
    fields.employer_identification_number,
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      const normalized = normalizeEin(c);
      if (normalized) return normalized;
    }
  }
  return null;
}
