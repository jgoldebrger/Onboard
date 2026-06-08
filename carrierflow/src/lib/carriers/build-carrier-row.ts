import type { CarrierRow } from "@/app/(admin)/_components/tables/carriers-table";

type AnswerSlice = {
  value: unknown;
  question: { key: string };
};

type GovSlice = {
  dotNumber: string | null;
  mcNumber: string | null;
  companyName: string | null;
  status: string;
};

function answerText(answers: AnswerSlice[], key: string): string | null {
  const row = answers.find((a) => a.question.key === key);
  if (!row?.value) return null;
  if (typeof row.value === "string") return row.value;
  if (typeof row.value === "number") return String(row.value);
  return JSON.stringify(row.value);
}

export function buildCarrierRow(input: {
  id: string;
  status: string;
  riskScore: number;
  riskLevel: string;
  updatedAt: Date;
  user: { email: string; companyName: string | null };
  carrierType: { id: string; name: string } | null;
  answers: AnswerSlice[];
  govVerifications: GovSlice[];
}): CarrierRow {
  const latestGov = input.govVerifications[0];
  return {
    id: input.id,
    email: input.user.email,
    companyName: input.user.companyName,
    legalName:
      latestGov?.companyName ?? answerText(input.answers, "company_legal_name"),
    dotNumber: latestGov?.dotNumber ?? answerText(input.answers, "dot_number"),
    mcNumber: latestGov?.mcNumber ?? answerText(input.answers, "mc_number"),
    status: input.status,
    carrierTypeName: input.carrierType?.name ?? null,
    carrierTypeId: input.carrierType?.id ?? null,
    verificationStatus: latestGov?.status ?? null,
    riskScore: input.riskScore,
    riskLevel: input.riskLevel,
    updatedAt: input.updatedAt.toISOString(),
  };
}
