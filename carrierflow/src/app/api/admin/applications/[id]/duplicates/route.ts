import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getDuplicateWarnings } from "@/lib/fraud/duplicate-dot";
import { handleApiError } from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("applications:read");
    const { id } = await params;
    const result = await getDuplicateWarnings(id);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
