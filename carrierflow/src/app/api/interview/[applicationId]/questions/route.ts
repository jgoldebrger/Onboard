import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOnboardingProgress } from "@/lib/interview/onboarding-state";
import { db } from "@/lib/db";
import { resolveRequirements } from "@/lib/rules";
import { assertApplicationOwner } from "@/app/api/interview/_utils";

type Params = { params: Promise<{ applicationId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { applicationId } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await assertApplicationOwner(applicationId, user.id);
  if ("error" in access && access.error) {
    return access.error;
  }

  const requirements = await resolveRequirements(applicationId);
  const progress = await getOnboardingProgress(applicationId);

  const [questions, answers] = await Promise.all([
    db.question.findMany({
      where: {
        isActive: true,
        id: { in: requirements.requiredQuestionIds },
      },
      orderBy: { key: "asc" },
    }),
    db.applicationAnswer.findMany({
      where: { applicationId },
      select: { questionId: true, value: true },
    }),
  ]);

  const answerByQuestionId = new Map(
    answers.map((a) => [a.questionId, a.value]),
  );

  const nextQuestion =
    progress.nextPrompt?.kind === "question"
      ? {
          key: progress.nextPrompt.key,
          label: progress.nextPrompt.label,
          prompt: progress.nextPrompt.prompt,
        }
      : null;

  return NextResponse.json({
    phase: progress.phase,
    nextPrompt: progress.nextPrompt,
    carrierTypeSlug: progress.carrierTypeSlug,
    carrierTypeName: progress.carrierTypeName,
    nextQuestion,
    progress: {
      questionsTotal: progress.questionsTotal,
      questionsAnswered: progress.questionsAnswered,
      documentsTotal: progress.documentsTotal,
      documentsUploaded: progress.documentsUploaded,
      identityComplete: progress.identityComplete,
    },
    identity: {
      complete: progress.identityComplete,
      status: progress.identityStatus,
    },
    requirements: {
      requiredQuestionIds: requirements.requiredQuestionIds,
      requiredDocumentTypeIds: requirements.requiredDocumentTypeIds,
      blocked: progress.blocked,
      blockReasons: progress.blockReasons,
    },
    questions: questions.map((q) => ({
      id: q.id,
      key: q.key,
      label: q.label,
      type: q.type,
      options: q.options,
      validation: q.validation,
      required: requirements.requiredQuestionIds.includes(q.id),
      answered: answerByQuestionId.has(q.id),
      value: answerByQuestionId.get(q.id) ?? null,
    })),
    documentTypes: progress.documentTypes,
    processingDocument: progress.processingDocument,
  });
}
