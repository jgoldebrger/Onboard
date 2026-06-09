import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import { createComplianceAlert } from "@/lib/compliance/alerts";
import {
  evaluateDocumentExpiry,
  mergeQualification,
} from "@/lib/compliance/evaluate";
import { updateProfileQualification } from "@/lib/compliance/profile";
import { syncMonitoredDocumentsFromApplication } from "@/lib/compliance/monitored-docs";

export const complianceDocumentExpiry = inngest.createFunction(
  {
    id: "compliance/document-expiry",
    triggers: [{ cron: "0 7 * * *" }],
  },
  async ({ step }) => {
    return step.run("check-document-expiry", async () => {
      const profiles = await db.carrierProfile.findMany({
        include: { application: { select: { id: true, status: true } } },
      });

      const results = [];
      for (const profile of profiles) {
        if (profile.application.status !== "APPROVED") continue;

        await syncMonitoredDocumentsFromApplication(
          profile.id,
          profile.application.id,
        );
        const monitoredDocs = await db.monitoredDocument.findMany({
          where: { carrierProfileId: profile.id },
        });
        const expiryResult = evaluateDocumentExpiry(monitoredDocs);

        for (const alert of expiryResult.alerts) {
          await createComplianceAlert({
            carrierProfileId: profile.id,
            ...alert,
          });
        }

        const newStatus = mergeQualification([
          profile.qualificationStatus,
          expiryResult.qualificationStatus,
        ]);
        if (newStatus !== profile.qualificationStatus) {
          await updateProfileQualification(profile.id, newStatus);
        }

        results.push({
          profileId: profile.id,
          alertCount: expiryResult.alerts.length,
          qualificationStatus: newStatus,
        });
      }
      return results;
    });
  },
);
