import type { QualificationStatus } from "@prisma/client";
import { QualificationBadge } from "./qualification-badge";

export type ComplianceSnapshotRow = {
  id: string;
  checkedAt: string;
  qualificationStatus: QualificationStatus;
  derivedFlags: string[];
  fmcsaData?: Record<string, unknown> | null;
  documentFlags?: unknown;
};

export function ComplianceTimeline({
  snapshots,
}: {
  snapshots: ComplianceSnapshotRow[];
}) {
  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No compliance checks yet. Snapshots appear after the first scheduled
        refresh for approved carriers.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border text-sm">
      {snapshots.map((snap, index) => (
        <li key={snap.id} className="px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              Check #{snapshots.length - index} —{" "}
              {new Date(snap.checkedAt).toLocaleString()}
            </span>
            <QualificationBadge status={snap.qualificationStatus} />
          </div>
          {snap.derivedFlags.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Flags: {snap.derivedFlags.map((f) => f.replace(/_/g, " ")).join(" · ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No flags</p>
          )}
          {snap.fmcsaData && typeof snap.fmcsaData === "object" ? (
            <dl className="grid gap-1 text-xs sm:grid-cols-3">
              {"dotStatus" in snap.fmcsaData && snap.fmcsaData.dotStatus ? (
                <div>
                  <dt className="text-muted-foreground">DOT status</dt>
                  <dd>{String(snap.fmcsaData.dotStatus)}</dd>
                </div>
              ) : null}
              {"authorityStatus" in snap.fmcsaData &&
              snap.fmcsaData.authorityStatus ? (
                <div>
                  <dt className="text-muted-foreground">Authority</dt>
                  <dd>{String(snap.fmcsaData.authorityStatus)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
