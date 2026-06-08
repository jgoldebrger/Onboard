"use client";

import { DocumentOverride } from "@/components/admin/document-override";
import {
  CsaBasicsTable,
  SaferFieldTable,
} from "@/components/admin/safer-field-table";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import type { DocumentsByTypeGroup } from "@/lib/carriers/document-versions";
import { parseCsaBasicsRows } from "@/lib/fmcsa/display-format";
import type { SaferTabSection } from "@/lib/fmcsa/safer-tabs";

function SaferTabPanel({
  section,
  basicsRaw,
}: {
  section: SaferTabSection;
  basicsRaw?: unknown;
}) {
  const fieldCount = Object.keys(section.fields).length;
  const csaRows =
    section.id === "safety-rating" ? parseCsaBasicsRows(basicsRaw) : [];

  const tableFields = { ...section.fields };
  if (section.id === "safety-rating") {
    for (const key of Object.keys(tableFields)) {
      if (key.startsWith("basics")) delete tableFields[key];
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{section.description}</p>
      {section.empty && csaRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No data from FMCSA for this section. Use &quot;Refresh from FMCSA&quot;
          above if the carrier has a DOT number.
        </p>
      ) : (
        <>
          {fieldCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {fieldCount} field{fieldCount === 1 ? "" : "s"}
            </p>
          ) : null}
          {section.id === "safety-rating" && csaRows.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">CSA BASIC scores</h4>
              <CsaBasicsTable rows={csaRows} />
            </div>
          ) : null}
          {Object.keys(tableFields).length > 0 ? (
            <SaferFieldTable data={tableFields} />
          ) : null}
        </>
      )}
    </div>
  );
}

function FilesByTypePanel({
  applicationId,
  groups,
  ruleVersionSnapshot,
  fmcsaSyncHistory,
}: {
  applicationId: string;
  groups: DocumentsByTypeGroup[];
  ruleVersionSnapshot: unknown;
  fmcsaSyncHistory: {
    id: string;
    verifiedAt: string;
    status: string;
    dotNumber: string | null;
    provider: string;
  }[];
}) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Files by document type</h3>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.typeKey} className="rounded-lg border border-border">
                <div className="border-b border-border bg-muted/40 px-4 py-2">
                  <span className="font-medium">{group.typeName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {group.versions.length} version
                    {group.versions.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="divide-y text-sm">
                  {group.versions.map((v) => (
                    <li key={v.id} className="px-4 py-3 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <span className="font-medium">v{v.version}</span> —{" "}
                          {v.fileName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.uploadedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(v.fileSize / 1024).toFixed(1)} KB · {v.mimeType}
                        {v.reviewStatus ? (
                          <>
                            {" "}
                            · Review:{" "}
                            <span className="font-medium text-foreground">
                              {v.reviewStatus}
                            </span>
                            {v.reviewProgress != null && v.reviewStatus === "PROCESSING"
                              ? ` (${v.reviewProgress}%)`
                              : null}
                          </>
                        ) : null}
                      </div>
                      {v.failureReasons.length > 0 ? (
                        <div className="text-xs text-destructive">
                          {v.failureReasons.join("; ")}
                        </div>
                      ) : null}
                      {v.reviewId &&
                      v.reviewStatus &&
                      (v.reviewStatus === "FAILED" ||
                        v.reviewStatus === "NEEDS_REVIEW") ? (
                        <DocumentOverride
                          applicationId={applicationId}
                          reviewId={v.reviewId}
                          fileName={v.fileName}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">FMCSA sync history</h3>
        {fmcsaSyncHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No government verification syncs yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {fmcsaSyncHistory.map((row, index) => (
              <li key={row.id} className="flex justify-between gap-4 px-4 py-2">
                <span>
                  v{fmcsaSyncHistory.length - index} — DOT {row.dotNumber ?? "—"}{" "}
                  ({row.status})
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(row.verifiedAt).toLocaleString()} · {row.provider}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Rules version snapshot</h3>
        {ruleVersionSnapshot ? (
          <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">
            {JSON.stringify(ruleVersionSnapshot, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            No rule version captured on this application.
          </p>
        )}
      </section>
    </div>
  );
}

export type CarrierDetailTabsProps = {
  saferSections: SaferTabSection[];
  saferMeta: Record<string, unknown>;
  basicsRaw?: unknown;
  fmcsaLegalName?: string | null;
  verificationSummary: {
    status: string;
    dotNumber: string | null;
    mcNumber: string | null;
    companyName: string | null;
    dotStatus: string | null;
    mcStatus: string | null;
    authorityStatus: string | null;
    matchScore: number | null;
    riskFlags: string[];
    verifiedAt: string | null;
  } | null;
  documentGroups: DocumentsByTypeGroup[];
  ruleVersionSnapshot: unknown;
  fmcsaSyncHistory: {
    id: string;
    verifiedAt: string;
    status: string;
    dotNumber: string | null;
    provider: string;
  }[];
  answers: { label: string; value: unknown; source: string }[];
  identity: Record<string, unknown> | null;
  riskAssessments: { assessedAt: string; totalScore: number; riskLevel: string; breakdown: unknown }[];
  approvalLogs: { action: string; actorEmail: string; createdAt: string; notes: string | null }[];
  applicationId: string;
};

export function CarrierDetailTabs(props: CarrierDetailTabsProps) {
  const snapshotSection = props.saferSections.find((s) => s.id === "snapshot");

  const saferTabs: TabItem[] = props.saferSections.map((section) => {
    const count = Object.keys(section.fields).length;
    return {
      id: section.id,
      label: section.label,
      badge: count > 0 ? count : undefined,
      content: (
        <SaferTabPanel section={section} basicsRaw={props.basicsRaw} />
      ),
    };
  });

  const overviewTab: TabItem = {
    id: "overview",
    label: "Overview",
    content: (
      <div className="space-y-6">
        {props.verificationSummary ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem label="Verification" value={props.verificationSummary.status} />
              <SummaryItem label="DOT" value={props.verificationSummary.dotNumber ?? "—"} />
              <SummaryItem label="MC (on file)" value={props.verificationSummary.mcNumber ?? "—"} />
              <SummaryItem
                label="Applicant company"
                value={props.verificationSummary.companyName ?? "—"}
              />
              <SummaryItem
                label="FMCSA legal name"
                value={props.fmcsaLegalName ?? "—"}
              />
              <SummaryItem
                label="DOT status"
                value={props.verificationSummary.dotStatus ?? "—"}
              />
              <SummaryItem
                label="Authority"
                value={props.verificationSummary.authorityStatus ?? "—"}
              />
              <SummaryItem
                label="Match score"
                value={
                  props.verificationSummary.matchScore != null
                    ? `${Math.round(props.verificationSummary.matchScore * 100)}%`
                    : "—"
                }
              />
              <SummaryItem
                label="Last FMCSA sync"
                value={
                  props.verificationSummary.verifiedAt
                    ? new Date(props.verificationSummary.verifiedAt).toLocaleString()
                    : "—"
                }
              />
            </dl>
            {props.verificationSummary.riskFlags.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <strong>Risk flags:</strong>{" "}
                {props.verificationSummary.riskFlags
                  .map((f) => f.replace(/_/g, " "))
                  .join(" · ")}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No FMCSA verification on file. Data appears after the carrier enters a
            DOT number during onboarding.
          </p>
        )}

        {snapshotSection && !snapshotSection.empty ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Registry snapshot</h3>
            <p className="text-xs text-muted-foreground">
              Key fields from FMCSA. Use the tabs above for inspections, crashes,
              CSA scores, authority, and more.
            </p>
            <div className="rounded-lg border border-border bg-card p-4">
              <SaferFieldTable data={snapshotSection.fields} />
            </div>
          </div>
        ) : null}

        {Object.keys(props.saferMeta).length > 0 ? (
          <details className="rounded-md border border-border text-sm">
            <summary className="cursor-pointer px-4 py-2 font-medium text-muted-foreground">
              Technical sync details
            </summary>
            <div className="border-t border-border px-4 py-3">
              <SaferFieldTable data={props.saferMeta} />
            </div>
          </details>
        ) : null}
      </div>
    ),
  };

  const filesTab: TabItem = {
    id: "files",
    label: "Files & versions",
    badge: props.documentGroups.reduce((n, g) => n + g.versions.length, 0) || undefined,
    content: (
      <FilesByTypePanel
        applicationId={props.applicationId}
        groups={props.documentGroups}
        ruleVersionSnapshot={props.ruleVersionSnapshot}
        fmcsaSyncHistory={props.fmcsaSyncHistory}
      />
    ),
  };

  const onboardingTab: TabItem = {
    id: "onboarding",
    label: "Onboarding data",
    content: (
      <div className="space-y-8">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Interview answers</h3>
          {props.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {props.answers.map((a, i) => (
                <li key={i} className="flex justify-between gap-4 px-4 py-2">
                  <span>{a.label}</span>
                  <span className="text-muted-foreground">
                    {JSON.stringify(a.value)}
                    <span className="text-xs"> ({a.source})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {props.identity ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Identity verification</h3>
            <SaferFieldTable
              data={props.identity as Record<string, unknown>}
            />
          </section>
        ) : null}
        {props.riskAssessments.length > 0 ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Risk assessments</h3>
            <ul className="divide-y rounded-lg border text-sm">
              {props.riskAssessments.map((r, i) => (
                <li key={i} className="px-4 py-2">
                  {r.totalScore} ({r.riskLevel}) —{" "}
                  {new Date(r.assessedAt).toLocaleString()}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {props.approvalLogs.length > 0 ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Approval log</h3>
            <ul className="divide-y rounded-lg border text-sm">
              {props.approvalLogs.map((log, i) => (
                <li key={i} className="px-4 py-2">
                  <span className="font-medium">{log.action}</span> by {log.actorEmail} —{" "}
                  {new Date(log.createdAt).toLocaleString()}
                  {log.notes ? (
                    <div className="text-muted-foreground">{log.notes}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    ),
  };

  const tabs: TabItem[] = [overviewTab, ...saferTabs, filesTab, onboardingTab];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">FMCSA / SAFER registry data</h2>
        <p className="text-xs text-muted-foreground">
          Select a tab for company info, authority, inspections, crashes, CSA
          scores, documents, and onboarding answers.
        </p>
      </div>
      <Tabs tabs={tabs} defaultTabId="snapshot" className="w-full" />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
