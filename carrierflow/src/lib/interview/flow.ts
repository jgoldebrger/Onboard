import { inferCarrierTypeFromMessage } from "@/lib/interview/carrier-type";
import {
  buildCarrierTypePrompt,
  buildPromptAfterSave,
  getOnboardingProgress,
  type NextPrompt,
  type OnboardingPhase,
} from "@/lib/interview/onboarding-state";
import { saveApplicationAnswer } from "@/lib/interview/save-answer";
import { isDotQuestionKey } from "@/lib/interview/question-order";
import { buildFmcsaCrossReferenceMessage } from "@/lib/fmcsa/cross-reference-message";
import { syncFmcsaFromDotAnswer, type FmcsaSyncResult } from "@/lib/fmcsa";
import { db } from "@/lib/db";

export type InterviewFlowResult = {
  message: string;
  phase: OnboardingPhase;
  nextPrompt: NextPrompt | null;
  detectedCarrierType?: string;
  savedAnswerKeys: string[];
  missingFields: string[];
  nextQuestions: string[];
  nextQuestion: {
    key: string;
    label: string;
    prompt: string;
  } | null;
  fmcsaLookupStarted?: boolean;
  fmcsaCrossReference?: FmcsaSyncResult | null;
};

function flowResultFromProgress(
  progress: Awaited<ReturnType<typeof getOnboardingProgress>>,
  opts: {
    message: string;
    savedAnswerKeys: string[];
    fmcsaLookupStarted?: boolean;
    fmcsaCrossReference?: FmcsaSyncResult | null;
  },
): InterviewFlowResult {
  const nextQuestion =
    progress.nextPrompt?.kind === "question"
      ? {
          key: progress.nextPrompt.key,
          label: progress.nextPrompt.label,
          prompt: progress.nextPrompt.prompt,
        }
      : null;

  return {
    message: opts.message,
    phase: progress.phase,
    nextPrompt: progress.nextPrompt,
    detectedCarrierType: progress.carrierTypeSlug ?? undefined,
    savedAnswerKeys: opts.savedAnswerKeys,
    missingFields: [],
    nextQuestions: nextQuestion ? [nextQuestion.key] : [],
    nextQuestion,
    fmcsaLookupStarted: opts.fmcsaLookupStarted,
    fmcsaCrossReference: opts.fmcsaCrossReference,
  };
}

async function handleDotAnswer(
  applicationId: string,
  dotValue: string,
): Promise<InterviewFlowResult> {
  const saveResult = await saveApplicationAnswer(
    applicationId,
    "dot_number",
    dotValue,
  );
  if (saveResult.error) {
    throw new ValidationError(saveResult.error);
  }

  const sync = await syncFmcsaFromDotAnswer(applicationId, dotValue);
  const progress = await getOnboardingProgress(applicationId);

  const crossRef = buildFmcsaCrossReferenceMessage(sync, dotValue);
  let reply = crossRef;
  if (progress.nextPrompt) {
    const next =
      progress.nextPrompt.kind === "carrier_type"
        ? progress.nextPrompt.prompt
        : buildPromptAfterSave(progress, saveResult.saved);
    reply = `${crossRef}\n\n${next}`;
  }

  return flowResultFromProgress(progress, {
    message: reply,
    savedAnswerKeys: saveResult.saved,
    fmcsaLookupStarted: true,
    fmcsaCrossReference: sync,
  });
}

export async function processInterviewMessage(
  applicationId: string,
  message: string,
  options?: { questionKey?: string },
): Promise<InterviewFlowResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("message is required");
  }

  const progressBefore = await getOnboardingProgress(applicationId);
  const answeringDot =
    options?.questionKey === "dot_number" ||
    (progressBefore.nextPrompt?.kind === "question" &&
      progressBefore.nextPrompt.key === "dot_number");

  if (answeringDot) {
    return handleDotAnswer(applicationId, trimmed);
  }

  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: {
      carrierType: { select: { slug: true } },
      detectedType: true,
    },
  });

  const carrierTypeSlug =
    application?.carrierType?.slug ?? application?.detectedType ?? null;

  if (!carrierTypeSlug) {
    const inferred = await inferCarrierTypeFromMessage(applicationId, trimmed);
    if (!inferred) {
      return flowResultFromProgress(
        {
          ...(await getOnboardingProgress(applicationId)),
          phase: "carrier_type",
          nextPrompt: {
            kind: "carrier_type",
            prompt: buildCarrierTypePrompt(),
          },
        },
        {
          message: buildCarrierTypePrompt(),
          savedAnswerKeys: [],
        },
      );
    }
    const progress = await getOnboardingProgress(applicationId);
    return flowResultFromProgress(progress, {
      message: progress.nextPrompt?.prompt ?? buildCarrierTypePrompt(),
      savedAnswerKeys: [],
    });
  }

  if (progressBefore.phase !== "questions") {
    const progress = await getOnboardingProgress(applicationId);
    return flowResultFromProgress(progress, {
      message:
        progress.nextPrompt?.prompt ??
        "Use the upload form below to continue.",
      savedAnswerKeys: [],
    });
  }

  const targetKey =
    options?.questionKey ??
    (progressBefore.nextPrompt?.kind === "question"
      ? progressBefore.nextPrompt.key
      : undefined);

  if (!targetKey) {
    const progress = await getOnboardingProgress(applicationId);
    return flowResultFromProgress(progress, {
      message: progress.nextPrompt?.prompt ?? buildPromptAfterSave(progress, []),
      savedAnswerKeys: [],
    });
  }

  if (isDotQuestionKey(targetKey)) {
    return handleDotAnswer(applicationId, trimmed);
  }

  const saveResult = await saveApplicationAnswer(
    applicationId,
    targetKey,
    trimmed,
  );
  if (saveResult.error) {
    throw new ValidationError(saveResult.error);
  }

  const progress = await getOnboardingProgress(applicationId);
  const reply = buildPromptAfterSave(progress, saveResult.saved);

  return flowResultFromProgress(progress, {
    message: reply,
    savedAnswerKeys: saveResult.saved,
  });
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
