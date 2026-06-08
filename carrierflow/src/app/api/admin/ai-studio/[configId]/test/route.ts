import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { requirePermission } from "@/lib/auth";
import { resolveAgentConfig } from "@/lib/agents/resolve-config";
import { DEFAULT_INTERVIEW_SYSTEM_PROMPT } from "@/lib/agents/prompts/defaults/interview";
import { DOCUMENT_REVIEW_SYSTEM_PROMPT } from "@/lib/agents/prompts/defaults/document-review";
import { DEFAULT_VERIFICATION_SYSTEM_PROMPT } from "@/lib/agents/prompts/defaults/verification";
import { db } from "@/lib/db";
import { handleApiError } from "../../../_utils";

const bodySchema = z.object({
  sampleMessage: z.string().min(1).default("Hello, this is a sandbox test."),
});

const DEFAULTS: Record<string, string> = {
  interview: DEFAULT_INTERVIEW_SYSTEM_PROMPT,
  document_review: DOCUMENT_REVIEW_SYSTEM_PROMPT,
  verification: DEFAULT_VERIFICATION_SYSTEM_PROMPT,
  risk: "You are the risk assessment agent.",
  approval: "You are the approval recommendation agent.",
};

type Params = { params: Promise<{ configId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requirePermission("config:manage");
    const { configId } = await params;
    const body = bodySchema.parse(await req.json());

    const config = await db.agentConfig.findUnique({ where: { id: configId } });
    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const agentConfig = await resolveAgentConfig(
      config.key,
      DEFAULTS[config.key] ?? "You are a helpful assistant.",
    );

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        preview: true,
        message: `[No OPENAI_API_KEY] Would use model ${agentConfig.model} with prompt length ${agentConfig.systemPrompt.length}`,
      });
    }

    const openai = new OpenAI({ apiKey });
    const started = Date.now();
    const completion = await openai.chat.completions.create({
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      max_tokens: Math.min(agentConfig.maxTokens, 1024),
      messages: [
        { role: "system", content: agentConfig.systemPrompt },
        { role: "user", content: body.sampleMessage },
      ],
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content ?? "",
      model: agentConfig.model,
      promptVersionId: agentConfig.promptVersionId,
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
