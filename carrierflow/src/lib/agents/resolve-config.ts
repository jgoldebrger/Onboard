import { db } from "@/lib/db";

export type ResolvedAgentConfig = {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  visionEnabled: boolean;
  promptVersionId?: string;
};

const ENV_MODEL: Record<string, string | undefined> = {
  interview: process.env.OPENAI_MODEL_INTERVIEW,
  document_review: process.env.OPENAI_MODEL_DOCUMENT,
  verification: process.env.OPENAI_MODEL_VERIFICATION,
  risk: process.env.OPENAI_MODEL_RISK,
  approval: process.env.OPENAI_MODEL_APPROVAL,
};

export async function resolveAgentConfig(
  agentKey: string,
  defaultPrompt: string,
): Promise<ResolvedAgentConfig> {
  const fallback: ResolvedAgentConfig = {
    systemPrompt: defaultPrompt,
    model: ENV_MODEL[agentKey] ?? "gpt-4o",
    temperature: 0.2,
    maxTokens: 4096,
    visionEnabled: agentKey === "document_review",
  };

  const config = await db.agentConfig.findUnique({
    where: { key: agentKey },
    include: {
      promptVersions: {
        where: { isPublished: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  const published = config?.promptVersions[0];
  if (!published || !config?.isActive) return fallback;

  return {
    systemPrompt: published.systemPrompt,
    model: published.model,
    temperature: published.temperature,
    maxTokens: published.maxTokens,
    visionEnabled: published.visionEnabled,
    promptVersionId: published.id,
  };
}

export async function logAgentRun(input: {
  agentConfigKey: string;
  promptVersionId?: string;
  applicationId?: string;
  latencyMs?: number;
  confidence?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.agentRunLog.create({
      data: {
        agentConfigKey: input.agentConfigKey,
        promptVersionId: input.promptVersionId,
        applicationId: input.applicationId,
        latencyMs: input.latencyMs,
        confidence: input.confidence,
        success: input.success ?? true,
        errorMessage: input.errorMessage,
        metadata: input.metadata as object | undefined,
      },
    });
  } catch {
    // non-blocking
  }
}
