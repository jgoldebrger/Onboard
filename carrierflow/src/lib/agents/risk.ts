import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { RiskLevel } from "@prisma/client";
import type { ConditionNode } from "@/types/domain";
import { logAgentRun, resolveAgentConfig } from "@/lib/agents/resolve-config";
import { DEFAULT_RISK_SYSTEM_PROMPT } from "@/lib/agents/prompts/defaults/risk";
import { db } from "@/lib/db";
import { buildEvaluationContext, resolveRequirements } from "@/lib/rules";
import { evaluateCondition } from "@/lib/rules/evaluator";

export type RiskAssessmentResult = {
  totalScore: number;
  riskLevel: RiskLevel;
  breakdown: { ruleId: string; label: string; points: number }[];
  summary?: string;
};

const riskAiSchema = z.object({
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  summary: z.string(),
});

function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export async function assessApplicationRisk(
  applicationId: string,
): Promise<RiskAssessmentResult> {
  const requirements = await resolveRequirements(applicationId);
  const context = await buildEvaluationContext(applicationId);
  const riskRules = await db.riskRule.findMany({ where: { isEnabled: true } });

  const breakdown = [
    ...requirements.riskAdditions.map((r) => ({
      ruleId: r.ruleId,
      label: r.label,
      points: r.points,
    })),
  ];

  for (const rr of riskRules) {
    const condition = rr.condition as ConditionNode | null;
    const applies =
      !condition ||
      typeof condition !== "object" ||
      !("type" in condition) ||
      evaluateCondition(condition, context);
    if (applies) {
      breakdown.push({
        ruleId: rr.id,
        label: rr.label,
        points: rr.points,
      });
    }
  }

  let totalScore = breakdown.reduce((sum, b) => sum + b.points, 0);
  let riskLevel = levelFromScore(totalScore);
  let summary: string | undefined;

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const agentConfig = await resolveAgentConfig("risk", DEFAULT_RISK_SYSTEM_PROMPT);
    const openai = new OpenAI({ apiKey });
    const started = Date.now();
    try {
      const completion = await openai.chat.completions.parse({
        model: agentConfig.model,
        temperature: agentConfig.temperature,
        max_tokens: Math.min(agentConfig.maxTokens, 1024),
        messages: [
          { role: "system", content: agentConfig.systemPrompt },
          {
            role: "user",
            content: JSON.stringify({ totalScore, breakdown, applicationId }),
          },
        ],
        response_format: zodResponseFormat(riskAiSchema, "risk_assessment"),
      });
      const parsed = completion.choices[0]?.message?.parsed;
      if (parsed) {
        riskLevel = parsed.riskLevel;
        summary = parsed.summary;
        await logAgentRun({
          agentConfigKey: "risk",
          promptVersionId: agentConfig.promptVersionId,
          applicationId,
          latencyMs: Date.now() - started,
          success: true,
        });
      }
    } catch {
      // keep rule-based level
    }
  }

  await db.riskAssessment.create({
    data: {
      applicationId,
      totalScore,
      riskLevel,
      breakdown: summary ? { items: breakdown, summary } : breakdown,
    },
  });

  await db.onboardingApplication.update({
    where: { id: applicationId },
    data: { riskScore: totalScore, riskLevel },
  });

  return { totalScore, riskLevel, breakdown, summary };
}
