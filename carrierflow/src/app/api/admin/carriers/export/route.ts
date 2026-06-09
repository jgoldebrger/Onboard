import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { buildCarrierRow } from "@/lib/carriers/build-carrier-row";
import { db } from "@/lib/db";
import { handleApiError } from "../../_utils";

function csvEscape(value: string | null | undefined): string {
  const s = value ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  try {
    await requirePermission("applications:read");

    const applications = await db.onboardingApplication.findMany({
      where: { status: "APPROVED" },
      include: {
        user: { select: { email: true, companyName: true } },
        carrierType: { select: { id: true, name: true } },
        govVerifications: {
          orderBy: { verifiedAt: "desc" },
          take: 1,
          select: {
            dotNumber: true,
            mcNumber: true,
            companyName: true,
            status: true,
          },
        },
        answers: {
          where: {
            question: {
              key: { in: ["dot_number", "mc_number", "company_legal_name"] },
            },
          },
          include: { question: { select: { key: true } } },
        },
        carrierProfile: {
          include: {
            monitoredDocuments: {
              where: { documentTypeKey: "coi" },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const headers = [
      "application_id",
      "legal_name",
      "email",
      "dot",
      "mc",
      "carrier_type",
      "qualification",
      "risk_score",
      "risk_level",
      "coi_expiration",
      "last_compliance_check",
    ];

    const rows = applications.map((app) => {
      const row = buildCarrierRow(app);
      return [
        row.id,
        row.legalName ?? row.companyName ?? "",
        row.email,
        row.dotNumber ?? "",
        row.mcNumber ?? "",
        row.carrierTypeName ?? "",
        row.qualificationStatus ?? "",
        String(row.riskScore),
        row.riskLevel,
        row.coiExpirationDate
          ? new Date(row.coiExpirationDate).toISOString().slice(0, 10)
          : "",
        row.lastComplianceCheck
          ? new Date(row.lastComplianceCheck).toISOString()
          : "",
      ]
        .map(csvEscape)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="approved-carriers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
