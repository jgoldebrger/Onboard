import Link from "next/link";
import { QualificationBadge } from "@/components/admin/compliance/qualification-badge";
import { db } from "@/lib/db";
import { buildCarrierRow } from "@/lib/carriers/build-carrier-row";
import { requireAdminPage } from "../_lib";
import { CarriersTable } from "../_components/tables/carriers-table";

export default async function CarriersPage() {
  await requireAdminPage("applications:read");

  const [applications, carrierTypes, qualCounts, openAlertCount] =
    await Promise.all([
    db.onboardingApplication.findMany({
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
              orderBy: { expirationDate: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.carrierType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.carrierProfile.groupBy({
      by: ["qualificationStatus"],
      _count: { _all: true },
    }),
    db.complianceAlert.count({ where: { status: "OPEN" } }),
  ]);

  const rows = applications.map((app) => buildCarrierRow(app));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Carriers</h1>
          <p className="text-sm text-muted-foreground">
            Onboarding applications with FMCSA (SAFER) data, documents, and
            version history.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
          <Link href="/compliance" className="text-primary hover:underline">
            Compliance inbox
            {openAlertCount > 0 ? ` (${openAlertCount} open)` : ""}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {(
          ["COMPLIANT", "ATTENTION", "NON_COMPLIANT", "SUSPENDED"] as const
        ).map((status) => {
          const row = qualCounts.find((q) => q.qualificationStatus === status);
          const count = row?._count._all ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={status}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            >
              <QualificationBadge status={status} />
              <span>{count}</span>
            </div>
          );
        })}
      </div>

      <CarriersTable data={rows} carrierTypes={carrierTypes} />
    </div>
  );
}
