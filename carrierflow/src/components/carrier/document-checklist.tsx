"use client";

import { cn } from "@/lib/utils";

type DocumentItem = {
  id: string;
  key: string;
  name: string;
  uploaded: boolean;
  reviewStatus: string | null;
};

function statusLabel(status: string | null, uploaded: boolean): string {
  if (!uploaded) return "Pending";
  if (!status || status === "PENDING" || status === "PROCESSING") return "Reviewing";
  if (status === "PASSED") return "Passed";
  if (status === "FAILED") return "Failed";
  if (status === "NEEDS_REVIEW") return "Needs review";
  return status.replace(/_/g, " ").toLowerCase();
}

function statusColor(status: string | null, uploaded: boolean): string {
  if (!uploaded) return "bg-muted text-muted-foreground";
  if (status === "PASSED") return "bg-emerald-100 text-emerald-800";
  if (status === "FAILED") return "bg-red-100 text-red-800";
  if (status === "NEEDS_REVIEW") return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-900";
}

export function DocumentChecklist({
  documents,
  questionsAnswered,
  questionsTotal,
}: {
  documents: DocumentItem[];
  questionsAnswered: number;
  questionsTotal: number;
}) {
  if (documents.length === 0 && questionsTotal === 0) return null;

  const docsPassed = documents.filter((d) => d.reviewStatus === "PASSED").length;
  const docsTotal = documents.length;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Onboarding progress</h2>
        <span className="text-xs text-muted-foreground">
          Questions {questionsAnswered}/{questionsTotal} · Documents {docsPassed}/
          {docsTotal} passed
        </span>
      </div>

      {questionsTotal > 0 ? (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Interview questions</span>
            <span>
              {Math.round((questionsAnswered / questionsTotal) * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (questionsAnswered / questionsTotal) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <ul className="divide-y rounded-md border text-sm">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="font-medium">{doc.name}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  statusColor(doc.reviewStatus, doc.uploaded),
                )}
              >
                {statusLabel(doc.reviewStatus, doc.uploaded)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
