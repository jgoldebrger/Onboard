import Link from "next/link";
import { AlertInbox } from "@/components/admin/compliance/alert-inbox";
import { QualificationBadge } from "@/components/admin/compliance/qualification-badge";
import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";

export default async function CompliancePage() {
  await requireAdminPage("applications:read");

  const [openAlerts, profiles] = await Promise.all([
    db.complianceAlert.findMany({
      where: { status: "OPEN" },
      include: {
        carrierProfile: {
          include: {
            application: {
              select: {
                id: true,
                user: { select: { email: true, companyName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.carrierProfile.findMany({
      include: {
        application: {
          select: {
            id: true,
            status: true,
            user: { select: { email: true, companyName: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const alertRows = openAlerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    createdAt: a.createdAt.toISOString(),
    carrierApplicationId: a.carrierProfile.application.id,
    carrierLabel:
      a.carrierProfile.legalName ??
      a.carrierProfile.application.user.companyName ??
      a.carrierProfile.application.user.email,
  }));

  const counts = {
    COMPLIANT: 0,
    ATTENTION: 0,
    NON_COMPLIANT: 0,
    SUSPENDED: 0,
  };
  for (const p of profiles) {
    if (p.application.status === "APPROVED") {
      counts[p.qualificationStatus]++;
    }
  }

  const attentionProfiles = profiles.filter(
    (p) =>
      p.application.status === "APPROVED" &&
      p.qualificationStatus !== "COMPLIANT",
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Compliance</h1>
        <p className="text-sm text-muted-foreground">
          Qualification status, open alerts, and monitoring for approved
          carriers.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Compliant" count={counts.COMPLIANT} status="COMPLIANT" />
        <StatCard label="Attention" count={counts.ATTENTION} status="ATTENTION" />
        <StatCard
          label="Non-compliant"
          count={counts.NON_COMPLIANT}
          status="NON_COMPLIANT"
        />
        <StatCard label="Open alerts" count={openAlerts.length} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Alert inbox</h2>
        <AlertInbox alerts={alertRows} />
      </section>

      {attentionProfiles.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Carriers needing attention</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {attentionProfiles.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
              >
                <span>
                  {p.legalName ??
                    p.application.user.companyName ??
                    p.application.user.email}
                  {p.dotNumber ? ` · DOT ${p.dotNumber}` : null}
                </span>
                <div className="flex items-center gap-2">
                  <QualificationBadge status={p.qualificationStatus} />
                  <Link
                    href={`/carriers/${p.application.id}`}
                    className="text-primary hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status?: "COMPLIANT" | "ATTENTION" | "NON_COMPLIANT";
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold">{count}</span>
        {status ? <QualificationBadge status={status} /> : null}
      </div>
    </div>
  );
}
