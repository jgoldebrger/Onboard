"use client";

export function DocumentReviewProgress({
  documentName,
  progress,
  step,
  status,
}: {
  documentName: string;
  progress: number;
  step: string | null;
  status: string | null;
}) {
  const pct = Math.min(100, Math.max(0, progress));
  const label = step ?? "Review in progress";

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Reviewing {documentName}
        </p>
        <span className="text-sm font-semibold tabular-nums text-primary">
          {pct}%
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Document review ${pct} percent`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {status ? (
        <p className="text-xs text-muted-foreground">
          Status: {status.replace(/_/g, " ")}
        </p>
      ) : null}
    </div>
  );
}
