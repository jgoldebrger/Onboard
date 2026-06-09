import type {
  ComplianceAlertType,
  QualificationStatus,
} from "@prisma/client";

export type CoiExtractedFields = {
  policyNumber?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  certificateHolder?: string | null;
  limits?: Record<string, unknown> | null;
};

export type FmcsaSnapshotData = {
  dotNumber?: string | null;
  mcNumber?: string | null;
  legalName?: string | null;
  dotStatus?: string | null;
  mcStatus?: string | null;
  authorityStatus?: string | null;
  riskFlags?: string[];
  csaScores?: Record<string, number>;
};

export type DocumentExpiryFlag = {
  documentTypeKey: string;
  documentId?: string | null;
  expirationDate: string;
  daysUntilExpiry: number;
};

export type ComplianceCheckResult = {
  qualificationStatus: QualificationStatus;
  derivedFlags: string[];
  fmcsaData?: FmcsaSnapshotData;
  documentFlags?: DocumentExpiryFlag[];
  ruleResults?: Record<string, unknown>;
  alertsToCreate: {
    type: ComplianceAlertType;
    severity: string;
    title: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }[];
};

export const QUALIFICATION_LABELS: Record<QualificationStatus, string> = {
  COMPLIANT: "Compliant",
  ATTENTION: "Attention",
  NON_COMPLIANT: "Non-compliant",
  SUSPENDED: "Suspended",
};

export const QUALIFICATION_COLORS: Record<
  QualificationStatus,
  "green" | "yellow" | "red" | "gray"
> = {
  COMPLIANT: "green",
  ATTENTION: "yellow",
  NON_COMPLIANT: "red",
  SUSPENDED: "gray",
};
