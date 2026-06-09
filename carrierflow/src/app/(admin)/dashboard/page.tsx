import Link from "next/link";
import { QualificationBadge } from "@/components/admin/compliance/qualification-badge";
import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";

export default async function DashboardPage() {
  await requireAdminPage("applications:read");

  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    pendingReview,
    approved,
    nonCompliant,
    openAlerts,
    expiringCoi,
    qualCounts,
    statusCounts,
    recentSubmissions,
    recentAudit,
    idleInProgress,
  ] = await Promise.all([
    db.onboardingApplication.count({ where: { status: "PENDING_REVIEW" } }),
    db.onboardingApplication.count({ where: { status: "APPROVED" } }),
    db.carrierProfile.count({
      where: { qualificationStatus: "NON_COMPLIANT" },
    }),
    db.complianceAlert.count({ where: { status: "OPEN" } }),
    db.monitoredDocument.count({
      where: {
        documentTypeKey: "coi",
        expirationDate: {
          lte: thirtyDaysOut,
          gte: today,
        },
      },
    }),
    db.carrierProfile.groupBy({
      by: ["qualificationStatus"],
      _count: { _all: true },
    }),
    db.onboardingApplication.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.onboardingApplication.findMany({
      where: { submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        user: { select: { email: true, companyName: true } },
      },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { email: true } } },
    }),
    db.onboardingApplication.count({
      where: {
        status: "IN_PROGRESS",
        updatedAt: { lt: sevenDaysAgo },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Operations dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Onboarding funnel, compliance posture, and expiring insurance.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/carriers" className="text-primary hover:underline">
            Carriers
          </Link>
          <Link href="/compliance" className="text-primary hover:underline">
            Compliance
          </Link>
          <a
            href="/api/admin/carriers/export"
            className="text-primary hover:underline"
          >
            Export CSV
          </a>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="Pending review" value={pendingReview} href="/applications" />
        <Metric label="Approved carriers" value={approved} href="/carriers" />
        <Metric label="Idle in progress (7d+)" value={idleInProgress} href="/applications" />
        <Metric label="Non-compliant" value={nonCompliant} href="/compliance" />
        <Metric label="Open alerts" value={openAlerts} href="/compliance" />
        <Metric label="COI expiring (30d)" value={expiringCoi} href="/carriers" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Applications by status</h2>
        <div className="flex flex-wrap gap-3">
          {statusCounts.map((row) => (
            <Link
              key={row.status}
              href="/applications"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <span className="text-muted-foreground">{row.status}</span>
              <span className="ml-2 font-semibold">{row._count._all}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Qualification breakdown</h2>
        <div className="flex flex-wrap gap-3">
          {(
            ["COMPLIANT", "ATTENTION", "NON_COMPLIANT", "SUSPENDED"] as const
          ).map((status) => {
            const row = qualCounts.find((q) => q.qualificationStatus === status);
            return (
              <div
                key={status}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <QualificationBadge status={status} />
                <span className="text-lg font-semibold">
                  {row?._count._all ?? 0}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link href="/audit" className="text-xs text-primary hover:underline">
            Full audit log
          </Link>
        </div>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {recentAudit.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
              >
                <span>
                  {log.actor?.email ?? "system"} — {log.action} ({log.entityType})
                </span>
                <span className="text-xs text-muted-foreground">
                  {log.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recent submissions</h2>
        {recentSubmissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {recentSubmissions.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
              >
                <span>
                  {app.user.companyName ?? app.user.email} — {app.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {app.submittedAt?.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border p-4 transition-colors hover:bg-muted/40"
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Link>
  );
}
