import { db } from "@/lib/db";

export async function setDocumentReviewProgress(
  documentId: string,
  progress: number,
  step: string,
) {
  const reviewProgress = Math.min(100, Math.max(0, Math.round(progress)));
  await db.documentReview.update({
    where: { documentId },
    data: { reviewProgress, reviewStep: step },
  });
}

export function reviewProgressFromRules(
  ruleResults: unknown,
  status: string,
): number {
  if (status !== "PROCESSING" && status !== "PENDING") {
    return 100;
  }
  if (!Array.isArray(ruleResults) || ruleResults.length === 0) {
    return 0;
  }
  return Math.min(95, 40 + ruleResults.length * 15);
}
