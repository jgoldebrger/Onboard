import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNotesPanel } from "@/components/admin/admin-notes-panel";
import { ApplicationActions } from "@/components/admin/application-actions";
import { PacketDownloadButton } from "@/components/admin/packet-download-button";
import { CarrierCompliancePanel } from "@/components/admin/compliance/carrier-compliance-panel";
import { QualificationBadge } from "@/components/admin/compliance/qualification-badge";
import { DuplicateDotBanner } from "@/components/admin/duplicate-dot-banner";
import { assessApplicationFraud, FraudPanel, getDuplicateWarnings } from "@/lib/fraud";
import { CarrierDetailTabs } from "@/components/admin/carrier-detail-tabs";
import { CarrierFmcsaRefresh } from "@/components/admin/carrier-fmcsa-refresh";
import { groupDocumentsByType } from "@/lib/carriers/document-versions";
import {
  buildSaferMeta,
  buildSaferTabSections,
  hasExtendedSaferData,
} from "@/lib/fmcsa/safer-tabs";
import { db } from "@/lib/db";
import { requireAdminPage } from "../../_lib";

type Params = { params: Promise<{ id: string }> };

export default async function CarrierDetailPage({ params }: Params) {
  await requireAdminPage("applications:read");
  const { id } = await params;

  const application = await db.onboardingApplication.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, companyName: true } },
      carrierType: true,
      answers: {
        include: { question: true },
        orderBy: { question: { key: "asc" } },
      },
      documents: {
        include: {
          documentType: { select: { key: true, name: true } },
          review: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
      govVerifications: { orderBy: { verifiedAt: "desc" } },
      identityVerification: true,
      riskAssessments: { orderBy: { assessedAt: "desc" } },
      approvalLogs: {
        include: { actor: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      },
      adminNotes: {
        include: { author: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      },
      carrierProfile: {
        include: {
          snapshots: { orderBy: { checkedAt: "desc" }, take: 20 },
          alerts: {
            where: { status: "OPEN" },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!application) notFound();

  const [fraudAssessment, duplicateWarnings] = await Promise.all([
    assessApplicationFraud(application.id),
    getDuplicateWarnings(application.id),
  ]);
  const rawFraudAssessment = application.fraudWaiverAt
    ? await assessApplicationFraud(application.id, { ignoreWaiver: true })
    : fraudAssessment;

  const latestGov = application.govVerifications[0];
  const rawResponse = latestGov?.rawResponse ?? null;
  const saferSections = buildSaferTabSections(rawResponse);
  const saferMeta = buildSaferMeta(rawResponse);
  const documentGroups = groupDocumentsByType(application.documents);

  const raw = rawResponse as {
    profile?: { legalName?: string | null };
    carrier?: { content?: { carrier?: { legalName?: string } } };
  } | null;
  const fmcsaLegalName =
    raw?.profile?.legalName ??
    raw?.carrier?.content?.carrier?.legalName ??
    null;

  const displayName =
    fmcsaLegalName ??
    latestGov?.companyName ??
    application.user.companyName ??
    application.user.email;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/carriers" className="text-sm text-primary hover:underline">
          ← Carriers
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{displayName}</h1>
          {application.status === "APPROVED" ? (
            <QualificationBadge
              status={application.carrierProfile?.qualificationStatus}
            />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {application.user.email}
          {latestGov?.dotNumber ? ` · DOT ${latestGov.dotNumber}` : null}
          {latestGov?.mcNumber ? ` · MC ${latestGov.mcNumber}` : null}
        </p>
        <div className="mt-2">
          <PacketDownloadButton applicationId={application.id} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Application status" value={application.status} />
        <Stat label="Risk" value={`${application.riskScore} (${application.riskLevel})`} />
        <Stat label="Carrier type" value={application.carrierType?.name ?? "—"} />
        <Stat
          label="SAFER verification"
          value={latestGov?.status ?? "Not synced"}
        />
        <Stat
          label="Documents"
          value={String(application.documents.length)}
        />
      </section>

      {application.recommendation ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <strong>Recommendation:</strong> {application.recommendation}
        </section>
      ) : null}

      {duplicateWarnings ? (
        <DuplicateDotBanner duplicates={duplicateWarnings} />
      ) : null}

      <ApplicationActions
        applicationId={application.id}
        status={application.status}
      />

      <AdminNotesPanel
        applicationId={application.id}
        initialNotes={application.adminNotes.map((note) => ({
          id: note.id,
          body: note.body,
          createdAt: note.createdAt.toISOString(),
          authorEmail: note.author.email,
        }))}
      />

      <FraudPanel
        fraud={fraudAssessment}
        contactDiscrepancies={fraudAssessment.contactDiscrepancies}
        applicationId={application.id}
        showWaiverForm={
          rawFraudAssessment.blockOnboarding && !application.fraudWaiverAt
        }
      />

      <CarrierFmcsaRefresh
        applicationId={application.id}
        needsFullSync={Boolean(latestGov && !hasExtendedSaferData(rawResponse))}
      />

      {application.status === "APPROVED" ? (
        <section className="rounded-lg border border-border p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Compliance monitoring</h2>
            <Link
              href="/compliance"
              className="text-sm text-primary hover:underline"
            >
              Open alert inbox
            </Link>
          </div>
          <CarrierCompliancePanel
            qualificationStatus={
              application.carrierProfile?.qualificationStatus ?? null
            }
            lastCheckedAt={
              application.carrierProfile?.lastCheckedAt?.toISOString() ?? null
            }
            snapshots={
              application.carrierProfile?.snapshots.map((s) => ({
                id: s.id,
                checkedAt: s.checkedAt.toISOString(),
                qualificationStatus: s.qualificationStatus,
                derivedFlags: s.derivedFlags,
                fmcsaData: s.fmcsaData as Record<string, unknown> | null,
                documentFlags: s.documentFlags,
              })) ?? []
            }
            openAlerts={
              application.carrierProfile?.alerts.map((a) => ({
                id: a.id,
                type: a.type,
                severity: a.severity,
                title: a.title,
                message: a.message,
                createdAt: a.createdAt.toISOString(),
              })) ?? []
            }
          />
        </section>
      ) : null}

      <CarrierDetailTabs
        applicationId={application.id}
        saferSections={saferSections}
        saferMeta={saferMeta}
        basicsRaw={(rawResponse as { basics?: unknown } | null)?.basics}
        fmcsaLegalName={fmcsaLegalName}
        verificationSummary={
          latestGov
            ? {
                status: latestGov.status,
                dotNumber: latestGov.dotNumber,
                mcNumber: latestGov.mcNumber,
                companyName: latestGov.companyName,
                dotStatus: latestGov.dotStatus,
                mcStatus: latestGov.mcStatus,
                authorityStatus: latestGov.authorityStatus,
                matchScore: latestGov.matchScore,
                riskFlags: latestGov.riskFlags,
                verifiedAt: latestGov.verifiedAt.toISOString(),
              }
            : null
        }
        documentGroups={documentGroups}
        ruleVersionSnapshot={application.ruleVersionSnapshot}
        fmcsaSyncHistory={application.govVerifications.map((v) => ({
          id: v.id,
          verifiedAt: v.verifiedAt.toISOString(),
          status: v.status,
          dotNumber: v.dotNumber,
          provider: v.provider,
        }))}
        answers={application.answers.map((a) => ({
          label: a.question.label,
          value: a.value,
          source: a.source,
        }))}
        identity={
          application.identityVerification
            ? {
                status: application.identityVerification.status,
                match: application.identityVerification.match,
                confidence: application.identityVerification.confidence,
                faceDetected: application.identityVerification.faceDetected,
                requiresHumanReview:
                  application.identityVerification.requiresHumanReview,
                createdAt: application.identityVerification.createdAt.toISOString(),
              }
            : null
        }
        riskAssessments={application.riskAssessments.map((r) => ({
          assessedAt: r.assessedAt.toISOString(),
          totalScore: r.totalScore,
          riskLevel: r.riskLevel,
          breakdown: r.breakdown,
        }))}
        approvalLogs={application.approvalLogs.map((log) => ({
          action: log.action,
          actorEmail: log.actor.email,
          createdAt: log.createdAt.toISOString(),
          notes: log.notes,
        }))}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
