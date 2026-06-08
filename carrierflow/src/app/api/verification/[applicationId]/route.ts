import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  formatVerificationResponse,
  requireVerificationAccess,
} from "../_utils";

type Params = { params: Promise<{ applicationId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { applicationId } = await params;
  const access = await requireVerificationAccess(applicationId);
  if ("error" in access) return access.error;

  const latest = await db.governmentVerification.findFirst({
    where: { applicationId },
    orderBy: { verifiedAt: "desc" },
  });

  if (!latest) {
    return NextResponse.json({ verification: null });
  }

  return NextResponse.json({
    verification: formatVerificationResponse(latest),
  });
}
