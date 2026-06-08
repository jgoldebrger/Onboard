import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { db } from "@/lib/db";
import { resolveRequirements } from "@/lib/rules";
import { logAgentRun, resolveAgentConfig } from "@/lib/agents/resolve-config";
import { DEFAULT_INTERVIEW_SYSTEM_PROMPT } from "@/lib/agents/prompts/defaults/interview";
import { buildInterviewReply } from "@/lib/agents/interview-prompts";
import { sortInterviewQuestions } from "@/lib/interview/question-order";

export type InterviewMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/** OpenAI structured outputs require nullable fields, not optional. */
const interviewResponseSchema = z.object({
  detectedCarrierType: z.string().nullable(),
  nextQuestions: z.array(z.string()),
  missingFields: z.array(z.string()),
  message: z.string(),
  parsedAnswers: z
    .array(
      z.object({
        questionKey: z.string(),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      }),
    )
    .nullable(),
});

export type InterviewAgentResult = {
  detectedCarrierType?: string;
  nextQuestions: string[];
  missingFields: string[];
  message: string;
  parsedAnswers?: { questionKey: string; value: unknown }[];
};

type QuestionRow = {
  id: string;
  key: string;
  label: string;
  type: string;
};

async function loadInterviewContext(applicationId: string) {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: {
      answers: { include: { question: true } },
      carrierType: true,
    },
  });

  if (!application) {
    throw new Error(`Application not found: ${applicationId}`);
  }

  const requirements = await resolveRequirements(applicationId);

  const requiredQuestions = sortInterviewQuestions(
    await db.question.findMany({
      where: {
        id: { in: requirements.requiredQuestionIds },
        isActive: true,
      },
    }),
  );

  const answeredKeys = new Set(
    application.answers.map((a) => a.question.key),
  );

  const missingQuestions = sortInterviewQuestions(
    requiredQuestions.filter((q) => !answeredKeys.has(q.key)),
  );

  const carrierTypes = await db.carrierType.findMany({
    where: { isActive: true },
    select: { slug: true, name: true },
  });

  return {
    application,
    requirements,
    requiredQuestions,
    missingQuestions,
    answeredKeys,
    carrierTypes,
  };
}

function buildFallbackResult(
  missingQuestions: QuestionRow[],
  carrierTypeSlug?: string | null,
): InterviewAgentResult {
  const missingFields = missingQuestions.map((q) => q.key);
  const nextQuestions =
    missingQuestions.length > 0 ? [missingQuestions[0].key] : [];

  return {
    detectedCarrierType: carrierTypeSlug ?? undefined,
    nextQuestions,
    missingFields,
    message: buildInterviewReply({
      missingQuestions,
      carrierTypeSlug,
    }),
  };
}

export async function getInterviewMissingQuestions(applicationId: string) {
  const ctx = await loadInterviewContext(applicationId);
  return {
    missingQuestions: ctx.missingQuestions,
    carrierTypeSlug:
      ctx.application.carrierType?.slug ?? ctx.application.detectedType,
    blocked: ctx.requirements.blocked,
    blockReasons: ctx.requirements.blockReasons,
  };
}

export async function runInterviewAgent(params: {
  applicationId: string;
  messages: InterviewMessage[];
}): Promise<InterviewAgentResult> {
  const ctx = await loadInterviewContext(params.applicationId);
  const { application, missingQuestions, requiredQuestions, carrierTypes } =
    ctx;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackResult(
      missingQuestions,
      application.carrierType?.slug ?? application.detectedType,
    );
  }

  const agentConfig = await resolveAgentConfig(
    "interview",
    DEFAULT_INTERVIEW_SYSTEM_PROMPT,
  );
  const openai = new OpenAI({ apiKey });
  const started = Date.now();

  const answersSummary = application.answers.map((a) => ({
    key: a.question.key,
    label: a.question.label,
    value: a.value,
  }));

  const contextBlock = JSON.stringify(
    {
      applicationId: params.applicationId,
      currentCarrierTypeSlug: application.carrierType?.slug ?? null,
      detectedType: application.detectedType,
      carrierTypeOptions: carrierTypes,
      requiredQuestionKeys: requiredQuestions.map((q) => q.key),
      missingQuestionKeys: missingQuestions.map((q) => q.key),
      missingQuestions: missingQuestions.map((q) => ({
        key: q.key,
        label: q.label,
        type: q.type,
      })),
      existingAnswers: answersSummary,
      blocked: ctx.requirements.blocked,
      blockReasons: ctx.requirements.blockReasons,
      requiredDocumentTypeIds: ctx.requirements.requiredDocumentTypeIds,
    },
    null,
    2,
  );

  try {
    const completion = await openai.chat.completions.parse({
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      max_tokens: agentConfig.maxTokens,
      messages: [
        { role: "system", content: agentConfig.systemPrompt },
        {
          role: "system",
          content: `Application context:\n${contextBlock}`,
        },
        ...params.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      response_format: zodResponseFormat(
        interviewResponseSchema,
        "interview_response",
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      await logAgentRun({
        agentConfigKey: "interview",
        promptVersionId: agentConfig.promptVersionId,
        applicationId: params.applicationId,
        latencyMs: Date.now() - started,
        success: false,
        errorMessage: "empty_parse",
      });
      return buildFallbackResult(
        missingQuestions,
        application.carrierType?.slug ?? application.detectedType,
      );
    }

    await logAgentRun({
      agentConfigKey: "interview",
      promptVersionId: agentConfig.promptVersionId,
      applicationId: params.applicationId,
      latencyMs: Date.now() - started,
      success: true,
    });

    return {
      detectedCarrierType: parsed.detectedCarrierType ?? undefined,
      nextQuestions: parsed.nextQuestions,
      missingFields: parsed.missingFields,
      message: parsed.message,
      parsedAnswers:
        parsed.parsedAnswers?.map((a) => ({
          questionKey: a.questionKey,
          value: a.value,
        })) ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "openai_error";
    await logAgentRun({
      agentConfigKey: "interview",
      promptVersionId: agentConfig.promptVersionId,
      applicationId: params.applicationId,
      latencyMs: Date.now() - started,
      success: false,
      errorMessage: message.slice(0, 500),
    }).catch(() => undefined);
    return buildFallbackResult(
      missingQuestions,
      application.carrierType?.slug ?? application.detectedType,
    );
  }
}
