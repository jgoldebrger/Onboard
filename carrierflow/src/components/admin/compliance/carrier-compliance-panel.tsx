import type { ComplianceAlertType, QualificationStatus } from "@prisma/client";
import { ComplianceTimeline } from "./compliance-timeline";
import { QualificationBadge } from "./qualification-badge";

export function CarrierCompliancePanel({
  qualificationStatus,
  lastCheckedAt,
  snapshots,
  openAlerts,
}: {
  qualificationStatus: QualificationStatus | null;
  lastCheckedAt: string | null;
  snapshots: {
    id: string;
    checkedAt: string;
    qualificationStatus: QualificationStatus;
    derivedFlags: string[];
    fmcsaData?: Record<string, unknown> | null;
    documentFlags?: unknown;
  }[];
  openAlerts: {
    id: string;
    type: ComplianceAlertType;
    severity: string;
    title: string;
    message: string | null;
    createdAt: string;
  }[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <QualificationBadge status={qualificationStatus} />
        {lastCheckedAt ? (
          <span className="text-sm text-muted-foreground">
            Last checked {new Date(lastCheckedAt).toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            Awaiting first compliance check
          </span>
        )}
      </div>

      {openAlerts.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Open alerts</h3>
          <ul className="divide-y rounded-lg border text-sm">
            {openAlerts.map((a) => (
              <li key={a.id} className="px-4 py-2">
                <div className="font-medium">{a.title}</div>
                {a.message ? (
                  <p className="text-muted-foreground">{a.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {a.type.replace(/_/g, " ")} · {a.severity} ·{" "}
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Compliance timeline</h3>
        <ComplianceTimeline snapshots={snapshots} />
      </section>
    </div>
  );
}
