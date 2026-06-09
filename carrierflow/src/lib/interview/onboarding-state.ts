import { getInterviewMissingQuestions } from "@/lib/agents/interview";
import { buildInterviewReply } from "@/lib/agents/interview-prompts";
import { buildDotFirstPrompt } from "@/lib/fmcsa/cross-reference-message";
import { assessApplicationFraud } from "@/lib/fraud";
import { db } from "@/lib/db";
import { resolveRequirements } from "@/lib/rules";

export type OnboardingPhase =
  | "carrier_type"
  | "questions"
  | "documents"
  | "identity"
  | "complete";

export type NextPrompt =
  | { kind: "carrier_type"; prompt: string }
  | { kind: "question"; key: string; label: string; prompt: string }
  | {
      kind: "document";
      documentTypeId: string;
      key: string;
      name: string;
      prompt: string;
      /** File uploaded; automated review still running — do not ask for the next document yet. */
      awaitingReview?: boolean;
    }
  | { kind: "identity"; prompt: string }
  | { kind: "complete"; prompt: string };

function documentNeedsAttention(doc: DocumentTypeProgress): boolean {
  if (!doc.uploaded) return true;
  if (
    !doc.reviewStatus ||
    doc.reviewStatus === "PROCESSING" ||
    doc.reviewStatus === "PENDING"
  ) {
    return true;
  }
  if (doc.reviewStatus === "PASSED") return false;
  return true;
}

function documentCountsTowardProgress(doc: DocumentTypeProgress): boolean {
  return doc.uploaded && doc.reviewStatus === "PASSED";
}

export function buildDocumentReviewingPrompt(name: string): string {
  return `Thanks — we received your ${name} and are reviewing it now. Please wait here; I'll ask for the next document when this review finishes.`;
}

export function buildDocumentReviewDonePrompt(
  name: string,
  status: string,
): string {
  if (status === "PASSED") {
    return `Your ${name} looks good.`;
  }
  if (status === "NEEDS_REVIEW") {
    return `We couldn't fully verify your ${name} automatically. Please upload a clearer copy, or our team will review it during application processing.`;
  }
  if (status === "FAILED") {
    return `We couldn't accept that ${name} file. Please upload it again using the form below.`;
  }
  return `Review of your ${name} finished (${status.replace(/_/g, " ")}).`;
}

export type DocumentTypeProgress = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  mimeTypes: unknown;
  uploaded: boolean;
  reviewStatus: string | null;
};

export type OnboardingProgress = {
  phase: OnboardingPhase;
  carrierTypeSlug: string | null;
  carrierTypeName: string | null;
  nextPrompt: NextPrompt | null;
  questionsTotal: number;
  questionsAnswered: number;
  documentsTotal: number;
  documentsUploaded: number;
  identityComplete: boolean;
  identityStatus: string | null;
  documentTypes: DocumentTypeProgress[];
  /** Document currently in automated review (if any). */
  processingDocument: {
    documentId: string;
    documentTypeId: string;
    name: string;
    reviewProgress: number;
    reviewStep: string | null;
  } | null;
  blocked: boolean;
  blockReasons: string[];
};

export function buildDocumentAskPrompt(name: string): string {
  return `Please upload your ${name}. Use the file picker below (PDF or image).`;
}

export function buildIdentityAskPrompt(): string {
  return `Almost done — please verify your identity. Upload a clear photo of your driver's license and a recent selfie using the form below.`;
}

export function buildCarrierTypePrompt(): string {
  return "Which type of carrier are you? For example: broker, long-haul, final-mile, or owner-operator.";
}

export function buildCompletePrompt(): string {
  return "You're all set on onboarding requirements. You can submit your application for review when you're ready.";
}

export async function getOnboardingProgress(
  applicationId: string,
): Promise<OnboardingProgress> {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: {
      carrierType: { select: { slug: true, name: true } },
      detectedType: true,
    },
  });

  const carrierTypeSlug =
    application?.carrierType?.slug ?? application?.detectedType ?? null;
  const carrierTypeName = application?.carrierType?.name ?? null;

  const requirements = await resolveRequirements(applicationId);
  const interviewState = await getInterviewMissingQuestions(applicationId);

  const [requiredQuestions, requiredDocTypes, answers, uploads, identity] =
    await Promise.all([
      db.question.findMany({
        where: {
          isActive: true,
          id: { in: requirements.requiredQuestionIds },
        },
        orderBy: { key: "asc" },
      }),
      db.documentType.findMany({
        where: {
          isActive: true,
          id: { in: requirements.requiredDocumentTypeIds },
        },
        orderBy: { key: "asc" },
      }),
      db.applicationAnswer.findMany({
        where: { applicationId },
        select: { questionId: true, question: { select: { key: true } } },
      }),
      db.carrierDocument.findMany({
        where: {
          applicationId,
          documentTypeId: { in: requirements.requiredDocumentTypeIds },
        },
        include: {
          review: {
            select: { status: true, reviewProgress: true, reviewStep: true },
          },
        },
        orderBy: { uploadedAt: "desc" },
      }),
      db.identityVerification.findUnique({
        where: { applicationId },
        select: { status: true, dlStorageKey: true, selfieStorageKey: true },
      }),
    ]);

  const answeredIds = new Set(answers.map((a) => a.questionId));
  const hasDotAnswer = answers.some((a) => a.question.key === "dot_number");
  const questionsAnswered = requiredQuestions.filter((q) =>
    answeredIds.has(q.id),
  ).length;

  const uploadByTypeId = new Map<
    string,
    { reviewStatus: string | null }
  >();
  for (const doc of uploads) {
    if (!doc.documentTypeId) continue;
    if (!uploadByTypeId.has(doc.documentTypeId)) {
      uploadByTypeId.set(doc.documentTypeId, {
        reviewStatus: doc.review?.status ?? null,
      });
    }
  }

  const documentTypes: DocumentTypeProgress[] = requiredDocTypes.map((d) => {
    const upload = uploadByTypeId.get(d.id);
    return {
      id: d.id,
      key: d.key,
      name: d.name,
      description: d.description,
      mimeTypes: d.mimeTypes,
      uploaded: Boolean(upload),
      reviewStatus: upload?.reviewStatus ?? null,
    };
  });

  const documentsUploaded = documentTypes.filter(documentCountsTowardProgress)
    .length;
  const missingDocs = documentTypes.filter(documentNeedsAttention);

  const processingUpload = uploads.find(
    (u) =>
      u.documentTypeId &&
      (u.review?.status === "PROCESSING" || u.review?.status === "PENDING"),
  );
  const processingDocType = processingUpload?.documentTypeId
    ? requiredDocTypes.find((d) => d.id === processingUpload.documentTypeId)
    : null;
  const processingDocument =
    processingUpload && processingDocType
      ? {
          documentId: processingUpload.id,
          documentTypeId: processingDocType.id,
          name: processingDocType.name,
          reviewProgress: processingUpload.review?.reviewProgress ?? 0,
          reviewStep: processingUpload.review?.reviewStep ?? null,
        }
      : null;

  const identityComplete = Boolean(
    identity?.dlStorageKey && identity?.selfieStorageKey,
  );

  let blocked = requirements.blocked;
  let blockReasons = [...requirements.blockReasons];

  if (hasDotAnswer && !blocked) {
    const fraud = await assessApplicationFraud(applicationId);
    if (fraud.blockOnboarding) {
      blocked = true;
      blockReasons = [
        ...blockReasons,
        `Fraud risk score ${fraud.score} (${fraud.level}) — contact support before submitting`,
        ...fraud.signals.map((s) => s.label),
      ];
    }
  }

  let phase: OnboardingPhase;
  let nextPrompt: NextPrompt | null;

  if (!hasDotAnswer) {
    phase = "questions";
    nextPrompt = {
      kind: "question",
      key: "dot_number",
      label: "DOT number",
      prompt: buildDotFirstPrompt(),
    };
  } else if (!carrierTypeSlug) {
    phase = "carrier_type";
    nextPrompt = { kind: "carrier_type", prompt: buildCarrierTypePrompt() };
  } else if (interviewState.missingQuestions.length > 0) {
    phase = "questions";
    const q = interviewState.missingQuestions[0];
    const prompt = buildInterviewReply({
      missingQuestions: interviewState.missingQuestions,
      carrierTypeSlug,
      blocked,
      blockReasons,
    });
    nextPrompt = {
      kind: "question",
      key: q.key,
      label: q.label,
      prompt,
    };
  } else if (missingDocs.length > 0) {
    phase = "documents";
    const doc = missingDocs[0];
    const awaitingReview =
      doc.uploaded &&
      (doc.reviewStatus === "PROCESSING" || doc.reviewStatus === "PENDING");
    nextPrompt = {
      kind: "document",
      documentTypeId: doc.id,
      key: doc.key,
      name: doc.name,
      awaitingReview,
      prompt: awaitingReview
        ? buildDocumentReviewingPrompt(doc.name)
        : buildDocumentAskPrompt(doc.name),
    };
  } else if (!identityComplete) {
    phase = "identity";
    nextPrompt = {
      kind: "identity",
      prompt: buildIdentityAskPrompt(),
    };
  } else {
    phase = "complete";
    nextPrompt = { kind: "complete", prompt: buildCompletePrompt() };
  }

  return {
    phase,
    carrierTypeSlug,
    carrierTypeName,
    nextPrompt,
    questionsTotal: requiredQuestions.length,
    questionsAnswered,
    documentsTotal: documentTypes.length,
    documentsUploaded,
    identityComplete,
    identityStatus: identity?.status ?? null,
    documentTypes,
    processingDocument,
    blocked,
    blockReasons,
  };
}

export function buildPromptAfterSave(
  progress: OnboardingProgress,
  savedAnswerKeys: string[],
): string {
  if (!progress.nextPrompt) {
    return buildCompletePrompt();
  }
  if (savedAnswerKeys.length > 0) {
    const p = progress.nextPrompt.prompt;
    if (progress.nextPrompt.kind === "question") {
      return `Got it. ${p}`;
    }
    if (
      progress.nextPrompt.kind === "document" ||
      progress.nextPrompt.kind === "identity"
    ) {
      return `Got it. ${p}`;
    }
  }
  return progress.nextPrompt.prompt;
}
