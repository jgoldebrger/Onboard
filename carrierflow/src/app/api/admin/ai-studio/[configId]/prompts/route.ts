import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../../_utils";

const createSchema = z.object({
  systemPrompt: z.string().min(1),
  model: z.string().min(1).default("gpt-4o"),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().min(256).max(128000).default(4096),
  visionEnabled: z.boolean().default(false),
});

type Params = { params: Promise<{ configId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("config:manage");
    const { configId } = await params;
    const body = createSchema.parse(await req.json());

    const config = await db.agentConfig.findUnique({ where: { id: configId } });
    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const latest = await db.agentPromptVersion.findFirst({
      where: { agentConfigId: configId },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;

    const prompt = await db.agentPromptVersion.create({
      data: {
        agentConfigId: configId,
        version,
        systemPrompt: body.systemPrompt,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        visionEnabled: body.visionEnabled,
        createdById: user.id,
      },
    });

    await auditLog({
      actorId: user.id,
      entityType: "AgentPromptVersion",
      entityId: prompt.id,
      action: "create_draft",
      after: { version, agentKey: config.key },
      ipAddress: clientIp(req),
    });

    return NextResponse.json(prompt, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
