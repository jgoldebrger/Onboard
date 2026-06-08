import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "../_utils";

export async function GET() {
  try {
    await requirePermission("config:manage");
    const partnerTypes = await db.partnerType.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(partnerTypes);
  } catch (err) {
    return handleApiError(err);
  }
}
