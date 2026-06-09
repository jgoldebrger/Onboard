import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { simulateRules } from "@/lib/rules/simulate";
import { handleApiError } from "../../_utils";

const bodySchema = z.object({
  carrierTypeSlug: z.string().min(1),
  answers: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    await requirePermission("config:manage");
    const body = bodySchema.parse(await req.json());
    const result = await simulateRules(body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
