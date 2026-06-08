import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationActions } from "@/components/admin/application-actions";
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
    },
  });

  if (!application) notFound();

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
        <h1 className="mt-2 text-xl font-semibold">{displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {application.user.email}
          {latestGov?.dotNumber ? ` · DOT ${latestGov.dotNumber}` : null}
          {latestGov?.mcNumber ? ` · MC ${latestGov.mcNumber}` : null}
        </p>
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

      <ApplicationActions applicationId={application.id} />

      <CarrierFmcsaRefresh
        applicationId={application.id}
        needsFullSync={Boolean(latestGov && !hasExtendedSaferData(rawResponse))}
      />

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
