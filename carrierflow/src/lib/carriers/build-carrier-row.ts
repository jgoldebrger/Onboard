import type { QualificationStatus } from "@prisma/client";
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

type ProfileSlice = {
  qualificationStatus: QualificationStatus;
  lastCheckedAt: Date | null;
  monitoredDocuments?: { expirationDate: Date | null }[];
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
  carrierProfile?: ProfileSlice | null;
}): CarrierRow {
  const latestGov = input.govVerifications[0];
  const coiExpiry = input.carrierProfile?.monitoredDocuments?.find(
    (d) => d.expirationDate,
  )?.expirationDate;

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
    qualificationStatus: input.carrierProfile?.qualificationStatus ?? null,
    lastComplianceCheck:
      input.carrierProfile?.lastCheckedAt?.toISOString() ?? null,
    coiExpirationDate: coiExpiry?.toISOString() ?? null,
  };
}
