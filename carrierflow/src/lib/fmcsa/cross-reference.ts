import type { FmcsaSyncResult } from "./persist-for-application";
import { scoreContactDiscrepancies } from "@/lib/fraud/contact-discrepancy";

export type StructuredCrossReferenceAlert = {
  field: string;
  severity: "low" | "medium" | "high";
  message: string;
};

export function buildStructuredCrossReferenceAlerts(
  sync: FmcsaSyncResult | null,
  application: {
    companyLegalName?: string | null;
    phone?: string | null;
    email?: string | null;
  },
): StructuredCrossReferenceAlert[] {
  if (!sync?.found) return [];

  const result = scoreContactDiscrepancies({
    application: {
      companyLegalName: application.companyLegalName,
      phone: application.phone,
      email: application.email,
    },
    fmcsa: {
      legalName: sync.legalName,
    },
  });

  const alerts: StructuredCrossReferenceAlert[] = [];

  if (sync.matchScore < 0.7) {
    alerts.push({
      field: "overall_match",
      severity: "medium",
      message: `FMCSA cross-reference match is ${Math.round(sync.matchScore * 100)}%`,
    });
  }

  for (const flag of sync.riskFlags) {
    alerts.push({
      field: flag,
      severity: "medium",
      message: flag.replace(/_/g, " "),
    });
  }

  for (const d of result.discrepancies) {
    alerts.push({
      field: d.field,
      severity: d.severity,
      message: `Application ${d.field} differs from FMCSA registry`,
    });
  }

  return alerts;
}
