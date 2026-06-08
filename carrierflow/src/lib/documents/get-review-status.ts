import type { User, UserRole } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export type DocumentReviewPayload = {
  status: string;
  reviewProgress: number;
  reviewStep: string | null;
  ruleResults: unknown[];
  failureReasons: string[];
};

export type DocumentReviewApiError = {
  error: string;
  code: string;
  httpStatus: number;
};

export async function getDocumentReviewStatus(
  applicationId: string,
  docId: string,
  user: Pick<User, "id" | "role">,
): Promise<DocumentReviewPayload | DocumentReviewApiError> {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true },
  });

  if (!application) {
    return {
      error: "Application not found",
      code: "application_not_found",
      httpStatus: 404,
    };
  }

  const canAccessAll = hasPermission(user.role as UserRole, "applications:read");
  if (application.userId !== user.id && !canAccessAll) {
    return { error: "Forbidden", code: "forbidden", httpStatus: 403 };
  }

  const document = await db.carrierDocument.findFirst({
    where: { id: docId, applicationId },
    include: { review: true },
  });

  if (!document) {
    return {
      error: "Document not found",
      code: "document_not_found",
      httpStatus: 404,
    };
  }

  if (!document.review) {
    return {
      error: "Review not found",
      code: "review_not_found",
      httpStatus: 404,
    };
  }

  const { review } = document;
  const ruleResults = Array.isArray(review.ruleResults) ? review.ruleResults : [];

  return {
    status: review.status,
    reviewProgress: review.reviewProgress,
    reviewStep: review.reviewStep,
    ruleResults,
    failureReasons: review.failureReasons,
  };
}
