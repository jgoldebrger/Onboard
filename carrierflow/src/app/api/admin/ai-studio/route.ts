import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "../_utils";

export async function GET() {
  try {
    await requirePermission("config:manage");
    const configs = await db.agentConfig.findMany({
      orderBy: { key: "asc" },
      include: {
        promptVersions: {
          orderBy: { version: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      agents: configs.map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        isActive: c.isActive,
        published: c.promptVersions.find((v) => v.isPublished),
        latestDraft: c.promptVersions.find((v) => !v.isPublished),
        versions: c.promptVersions,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
