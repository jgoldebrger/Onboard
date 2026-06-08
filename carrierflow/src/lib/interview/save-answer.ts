import { db } from "@/lib/db";
import { validateQuestionAnswer } from "@/lib/questions/validation";

export type SaveAnswerResult = { saved: string[]; error?: string };

export async function saveApplicationAnswer(
  applicationId: string,
  questionKey: string,
  rawValue: unknown,
  source = "interview",
): Promise<SaveAnswerResult> {
  const question = await db.question.findFirst({
    where: { key: questionKey, isActive: true },
  });
  if (!question) {
    return { saved: [], error: `Unknown question: ${questionKey}` };
  }

  const result = validateQuestionAnswer(question, rawValue);
  if (!result.ok) {
    return { saved: [], error: result.message };
  }

  await db.applicationAnswer.upsert({
    where: {
      applicationId_questionId: {
        applicationId,
        questionId: question.id,
      },
    },
    create: {
      applicationId,
      questionId: question.id,
      value: result.value as object,
      source,
    },
    update: {
      value: result.value as object,
      source,
    },
  });

  await db.onboardingApplication.updateMany({
    where: { id: applicationId, status: "DRAFT" },
    data: { status: "IN_PROGRESS" },
  });

  return { saved: [questionKey] };
}

/** Pre-fill from FMCSA only when the carrier has not already answered. */
export async function saveApplicationAnswerIfEmpty(
  applicationId: string,
  questionKey: string,
  rawValue: unknown,
  source = "fmcsa",
): Promise<SaveAnswerResult> {
  const question = await db.question.findFirst({
    where: { key: questionKey, isActive: true },
  });
  if (!question) return { saved: [] };

  const existing = await db.applicationAnswer.findUnique({
    where: {
      applicationId_questionId: {
        applicationId,
        questionId: question.id,
      },
    },
  });
  if (existing) return { saved: [] };

  return saveApplicationAnswer(applicationId, questionKey, rawValue, source);
}
