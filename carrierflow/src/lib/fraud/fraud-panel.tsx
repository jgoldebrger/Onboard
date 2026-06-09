import type { FraudScoreResult } from "./score";
import type { ContactDiscrepancyResult } from "./contact-discrepancy";
import { FraudWaiverForm } from "@/components/admin/fraud-waiver-form";

export function FraudPanel({
  fraud,
  contactDiscrepancies,
  applicationId,
  showWaiverForm = false,
}: {
  fraud: FraudScoreResult;
  contactDiscrepancies: ContactDiscrepancyResult;
  applicationId?: string;
  showWaiverForm?: boolean;
}) {
  const rawBlocked = fraud.blockOnboarding && !fraud.waived;

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Fraud assessment</h3>
        <span className="text-sm font-medium">
          Score {fraud.score} ({fraud.level})
          {rawBlocked ? " · blocks onboarding" : ""}
          {fraud.waived ? " · waived" : ""}
        </span>
      </div>

      {fraud.waived ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Fraud block waived{fraud.waivedAt ? ` on ${new Date(fraud.waivedAt).toLocaleString()}` : ""}
          {fraud.waiverReason ? `: ${fraud.waiverReason}` : ""}
        </p>
      ) : null}

      {fraud.signals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fraud signals detected.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {fraud.signals.map((s) => (
            <li key={s.key} className="flex justify-between gap-4 px-3 py-2">
              <span>{s.label}</span>
              <span className="text-muted-foreground">
                +{s.points} ({s.severity})
              </span>
            </li>
          ))}
        </ul>
      )}

      {contactDiscrepancies.discrepancies.length > 0 ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Contact discrepancies
          </h4>
          <ul className="space-y-2 text-sm">
            {contactDiscrepancies.discrepancies.map((d) => (
              <li key={d.field} className="rounded-md bg-muted/40 px-3 py-2">
                <div className="font-medium">{d.field.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">
                  App: {d.applicationValue ?? "—"} · FMCSA: {d.fmcsaValue ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showWaiverForm && applicationId && rawBlocked ? (
        <FraudWaiverForm
          applicationId={applicationId}
          fraudScore={fraud.score}
          fraudLevel={fraud.level}
        />
      ) : null}
    </div>
  );
}
