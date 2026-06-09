import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createComplianceAlert } from "./alerts";
import {
  evaluateDocumentExpiry,
  evaluateFmcsaCompliance,
  evaluateRulesCompliance,
  mergeQualification,
} from "./evaluate";
import { ensureCarrierProfile, updateProfileQualification } from "./profile";
import { syncMonitoredDocumentsFromApplication } from "./monitored-docs";
import type { FmcsaSnapshotData } from "./types";

export async function refreshCarrierCompliance(applicationId: string) {
  const profile = await ensureCarrierProfile(applicationId);
  if (!profile) return { skipped: true as const, reason: "no_profile" };

  await syncMonitoredDocumentsFromApplication(profile.id, applicationId);

  const lastSnapshot = await db.complianceSnapshot.findFirst({
    where: { carrierProfileId: profile.id },
    orderBy: { checkedAt: "desc" },
  });
  const previousFmcsa = lastSnapshot?.fmcsaData as FmcsaSnapshotData | null;

  const fmcsaResult = await evaluateFmcsaCompliance({
    dotNumber: profile.dotNumber,
    previousSnapshot: previousFmcsa,
  });

  const monitoredDocs = await db.monitoredDocument.findMany({
    where: { carrierProfileId: profile.id },
  });
  const expiryResult = evaluateDocumentExpiry(monitoredDocs);
  const rulesResult = await evaluateRulesCompliance(applicationId);

  const qualificationStatus = mergeQualification([
    fmcsaResult.qualificationStatus,
    expiryResult.qualificationStatus,
    rulesResult.qualificationStatus,
  ]);

  const derivedFlags = [
    ...fmcsaResult.derivedFlags,
    ...expiryResult.documentFlags.map((f) =>
      f.daysUntilExpiry < 0 ? `doc_expired_${f.documentTypeKey}` : `doc_expiring_${f.documentTypeKey}`,
    ),
  ];

  const snapshot = await db.complianceSnapshot.create({
    data: {
      carrierProfileId: profile.id,
      fmcsaData: fmcsaResult.fmcsaData ?? undefined,
      documentFlags: expiryResult.documentFlags,
      ruleResults: rulesResult.ruleResults as Prisma.InputJsonValue,
      derivedFlags,
      qualificationStatus,
    },
  });

  await updateProfileQualification(profile.id, qualificationStatus);

  if (fmcsaResult.fmcsaData) {
    await db.carrierProfile.update({
      where: { id: profile.id },
      data: {
        dotNumber: fmcsaResult.fmcsaData.dotNumber ?? profile.dotNumber,
        mcNumber: fmcsaResult.fmcsaData.mcNumber ?? profile.mcNumber,
      },
    });
  }

  const allAlerts = [
    ...fmcsaResult.alerts,
    ...expiryResult.alerts,
    ...rulesResult.alerts,
  ];
  for (const alert of allAlerts) {
    await createComplianceAlert({
      carrierProfileId: profile.id,
      ...alert,
    });
  }

  return {
    skipped: false as const,
    profileId: profile.id,
    snapshotId: snapshot.id,
    qualificationStatus,
    alertCount: allAlerts.length,
  };
}

export async function refreshAllApprovedCarriers() {
  const approved = await db.onboardingApplication.findMany({
    where: { status: "APPROVED" },
    select: { id: true },
  });

  const results = [];
  for (const app of approved) {
    try {
      results.push(await refreshCarrierCompliance(app.id));
    } catch (err) {
      console.error("Compliance refresh failed for", app.id, err);
      results.push({ skipped: true, applicationId: app.id, error: String(err) });
    }
  }
  return results;
}
