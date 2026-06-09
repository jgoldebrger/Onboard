import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "../../_utils";

function csvEscape(value: string | null | undefined): string {
  const s = value ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function POST(req: Request) {
  try {
    await requirePermission("applications:read");
    const body = (await req.json()) as { ids?: string[] };
    const ids = body.ids?.filter(Boolean) ?? [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Select at least one application" },
        { status: 400 },
      );
    }

    const applications = await db.onboardingApplication.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { email: true, companyName: true } },
        carrierType: { select: { name: true } },
        govVerifications: {
          orderBy: { verifiedAt: "desc" },
          take: 1,
          select: { dotNumber: true, mcNumber: true, companyName: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const headers = [
      "application_id",
      "status",
      "email",
      "company_name",
      "carrier_type",
      "dot",
      "mc",
      "legal_name",
      "risk_score",
      "risk_level",
      "updated_at",
    ];

    const rows = applications.map((app) => {
      const gov = app.govVerifications[0];
      return [
        app.id,
        app.status,
        app.user.email,
        app.user.companyName ?? "",
        app.carrierType?.name ?? "",
        gov?.dotNumber ?? "",
        gov?.mcNumber ?? "",
        gov?.companyName ?? "",
        String(app.riskScore),
        app.riskLevel,
        app.updatedAt.toISOString(),
      ]
        .map(csvEscape)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="applications-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
