import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getAdminNotificationCounts } from "@/lib/admin/notifications";
import { db } from "@/lib/db";
import { handleApiError } from "../_utils";

export async function GET() {
  try {
    await requirePermission("applications:read");

    const counts = await getAdminNotificationCounts();
    const [recentAlerts] = await Promise.all([
      db.complianceAlert.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          carrierProfile: {
            select: {
              applicationId: true,
              legalName: true,
              dotNumber: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ...counts,
      items: [
        ...recentAlerts.map((a) => ({
          id: a.id,
          kind: "compliance_alert" as const,
          title: a.title,
          message: a.message,
          severity: a.severity,
          href: a.carrierProfile.applicationId
            ? `/carriers/${a.carrierProfile.applicationId}`
            : "/compliance",
          createdAt: a.createdAt.toISOString(),
          carrierLabel:
            a.carrierProfile.legalName ??
            (a.carrierProfile.dotNumber
              ? `DOT ${a.carrierProfile.dotNumber}`
              : "Carrier"),
        })),
      ],
    });
  } catch (err) {
    return handleApiError(err);
  }
}
