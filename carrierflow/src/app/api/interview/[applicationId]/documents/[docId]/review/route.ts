import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDocumentReviewStatus } from "@/lib/documents/get-review-status";

type Params = { params: Promise<{ applicationId: string; docId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { applicationId, docId } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getDocumentReviewStatus(applicationId, docId, user);
  if ("httpStatus" in result) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.httpStatus },
    );
  }

  return NextResponse.json(result);
}
