import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { logAgentRun, resolveAgentConfig } from "@/lib/agents/resolve-config";
import { DEFAULT_APPROVAL_SYSTEM_PROMPT } from "@/lib/agents/prompts/defaults/approval";
import { db } from "@/lib/db";

export type ApprovalRecommendation = {
  recommendation: "approve" | "reject" | "manual_review";
  reasoning: string;
  blockers: string[];
};

const approvalSchema = z.object({
  recommendation: z.enum(["approve", "reject", "manual_review"]),
  reasoning: z.string(),
  blockers: z.array(z.string()),
});

function ruleBasedRecommendation(app: {
  documents: { fileName: string; review: { status: string } | null }[];
  govVerifications: { riskFlags: string[] }[];
  identityVerification: { requiresHumanReview: boolean } | null;
  riskLevel: string;
}): ApprovalRecommendation {
  const blockers: string[] = [];

  for (const doc of app.documents) {
    const status = doc.review?.status;
    if (status === "FAILED") {
      blockers.push(`Document ${doc.fileName} failed review`);
    }
    if (status === "PROCESSING" || status === "PENDING") {
      blockers.push(`Document ${doc.fileName} still processing`);
    }
  }

  const gov = app.govVerifications[0];
  if (gov?.riskFlags?.length) {
    blockers.push(...gov.riskFlags.map((f) => `FMCSA: ${f}`));
  }

  if (app.identityVerification?.requiresHumanReview) {
    blockers.push("Identity verification requires manual review");
  }

  if (app.riskLevel === "HIGH") {
    blockers.push("High risk score");
  }

  let recommendation: ApprovalRecommendation["recommendation"] = "approve";
  if (blockers.length > 0) {
    recommendation = app.riskLevel === "HIGH" ? "reject" : "manual_review";
  }

  return {
    recommendation,
    reasoning:
      blockers.length === 0
        ? "All checks passed or pending review only."
        : blockers.join("; "),
    blockers,
  };
}

export async function recommendApproval(
  applicationId: string,
): Promise<ApprovalRecommendation> {
  const app = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: {
      documents: { include: { review: true } },
      identityVerification: true,
      govVerifications: { orderBy: { verifiedAt: "desc" }, take: 1 },
      user: { select: { email: true, companyName: true } },
    },
  });

  if (!app) {
    throw new Error("Application not found");
  }

  const baseline = ruleBasedRecommendation(app);
  const apiKey = process.env.OPENAI_API_KEY;

  let result = baseline;
  if (apiKey) {
    const agentConfig = await resolveAgentConfig(
      "approval",
      DEFAULT_APPROVAL_SYSTEM_PROMPT,
    );
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
            content: JSON.stringify({
              applicationId,
              status: app.status,
              riskScore: app.riskScore,
              riskLevel: app.riskLevel,
              documents: app.documents.map((d) => ({
                fileName: d.fileName,
                reviewStatus: d.review?.status,
              })),
              gov: app.govVerifications[0],
              identity: app.identityVerification,
              ruleBased: baseline,
            }),
          },
        ],
        response_format: zodResponseFormat(approvalSchema, "approval"),
      });
      const parsed = completion.choices[0]?.message?.parsed;
      if (parsed) {
        result = parsed;
        await logAgentRun({
          agentConfigKey: "approval",
          promptVersionId: agentConfig.promptVersionId,
          applicationId,
          latencyMs: Date.now() - started,
          success: true,
        });
      }
    } catch {
      result = baseline;
    }
  }

  await db.onboardingApplication.update({
    where: { id: applicationId },
    data: { recommendation: result.recommendation },
  });

  return result;
}
