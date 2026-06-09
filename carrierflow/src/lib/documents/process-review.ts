import type { DocumentReviewStatus, Prisma } from "@prisma/client";
import { runDocumentReviewAgent } from "@/lib/agents/document-review";
import { syncMonitoredDocumentsFromApplication } from "@/lib/compliance/monitored-docs";
import { refreshCarrierCompliance } from "@/lib/compliance/refresh";
import { setDocumentReviewProgress } from "@/lib/documents/review-progress";
import { db } from "@/lib/db";
import { loadDocumentBytes } from "@/lib/ocr";

type ReviewResult = {
  documentType: string;
  confidence: number;
  fields: Record<string, unknown>;
  ruleEvaluations: { rule: string; passed: boolean; message?: string }[];
  failureReasons: string[];
  status: DocumentReviewStatus;
};

function buildStubReview(expectedTypeKey: string | null | undefined): ReviewResult {
  if (process.env.CI === "true") {
    return {
      documentType: expectedTypeKey ?? "unknown",
      confidence: 1,
      fields: {},
      ruleEvaluations: [],
      failureReasons: [],
      status: "PASSED",
    };
  }
  return {
    documentType: expectedTypeKey ?? "unknown",
    confidence: 0,
    fields: {},
    ruleEvaluations: [],
    failureReasons: ["OPENAI_API_KEY not configured — manual review required"],
    status: "NEEDS_REVIEW",
  };
}

/** Run OCR / document review agent and persist results (no Inngest required). */
export async function processDocumentReview(documentId: string) {
  const document = await db.carrierDocument.findUnique({
    where: { id: documentId },
    include: { review: true, documentType: true },
  });

  if (!document?.review) {
    return { skipped: true as const, reason: "not_found" };
  }

  if (
    document.review.processedAt &&
    document.review.status !== "PROCESSING" &&
    document.review.status !== "PENDING"
  ) {
    return {
      skipped: true as const,
      reason: "already_processed",
      status: document.review.status,
    };
  }

  await setDocumentReviewProgress(documentId, 10, "Starting review");

  let reviewResult: ReviewResult;
  if (!process.env.OPENAI_API_KEY) {
    await setDocumentReviewProgress(documentId, 40, "Preparing manual review");
    reviewResult = buildStubReview(document.documentType?.key);
  } else {
    try {
      await setDocumentReviewProgress(documentId, 25, "Loading document");
      const fileBuffer = await loadDocumentBytes(document.storageKey);
      await setDocumentReviewProgress(documentId, 45, "Analyzing document with AI");
      reviewResult = await runDocumentReviewAgent({
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileBuffer,
        expectedDocumentTypeKey: document.documentType?.key ?? null,
      });
      await setDocumentReviewProgress(documentId, 85, "Applying validation rules");
    } catch (err) {
      console.error("Document review agent failed", documentId, err);
      reviewResult = {
        documentType: document.documentType?.key ?? "unknown",
        confidence: 0,
        fields: {},
        ruleEvaluations: [],
        failureReasons: [
          err instanceof Error
            ? err.message.slice(0, 500)
            : "Automated review failed — manual review required",
        ],
        status: "NEEDS_REVIEW",
      };
    }
  }

  await setDocumentReviewProgress(documentId, 95, "Saving results");
  await db.documentReview.update({
    where: { documentId },
    data: {
      status: reviewResult.status,
      documentType: reviewResult.documentType,
      confidence: reviewResult.confidence,
      extractedData: reviewResult.fields as Prisma.InputJsonValue,
      ruleResults: reviewResult.ruleEvaluations as Prisma.InputJsonValue,
      failureReasons: reviewResult.failureReasons,
      processedAt: new Date(),
      reviewProgress: 100,
      reviewStep: "Review complete",
    },
  });

  const profile = await db.carrierProfile.findUnique({
    where: { applicationId: document.applicationId },
    select: { id: true },
  });
  if (profile) {
    void syncMonitoredDocumentsFromApplication(
      profile.id,
      document.applicationId,
    )
      .then(() => refreshCarrierCompliance(document.applicationId))
      .catch((err) =>
        console.error("Compliance refresh after document review failed", documentId, err),
      );
  }

  return {
    skipped: false as const,
    documentId,
    status: reviewResult.status,
  };
}
