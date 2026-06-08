import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "../../../_utils";

type Params = { params: Promise<{ configId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("config:manage");
    const { configId } = await params;
    const config = await db.agentConfig.findUnique({ where: { id: configId } });
    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const runs = await db.agentRunLog.findMany({
      where: { agentConfigKey: config.key },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ runs });
  } catch (err) {
    return handleApiError(err);
  }
}
