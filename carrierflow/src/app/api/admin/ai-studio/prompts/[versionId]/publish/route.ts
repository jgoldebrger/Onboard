import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../../../_utils";

type Params = { params: Promise<{ versionId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("rules:publish");
    const { versionId } = await params;

    const version = await db.agentPromptVersion.findUnique({
      where: { id: versionId },
      include: { agentConfig: true },
    });
    if (!version) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.$transaction([
      db.agentPromptVersion.updateMany({
        where: {
          agentConfigId: version.agentConfigId,
          isPublished: true,
        },
        data: { isPublished: false },
      }),
      db.agentPromptVersion.update({
        where: { id: versionId },
        data: { isPublished: true, publishedAt: new Date() },
      }),
    ]);

    await auditLog({
      actorId: user.id,
      entityType: "AgentPromptVersion",
      entityId: versionId,
      action: "publish",
      after: { agentKey: version.agentConfig.key, version: version.version },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
