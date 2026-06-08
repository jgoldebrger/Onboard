import { NextResponse } from "next/server";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const application = await db.onboardingApplication.findUnique({
    where: { id },
    include: {
      answers: true,
      documents: { include: { review: true } },
      carrierType: true,
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canReadAll = hasPermission(user.role, "applications:read");
  if (application.userId !== user.id && !canReadAll) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: application.id,
    status: application.status,
    carrierTypeId: application.carrierTypeId,
    riskScore: application.riskScore,
    riskLevel: application.riskLevel,
    progress: {
      questionsAnswered: application.answers.length,
      questionsRequired: 0,
      documentsUploaded: application.documents.length,
      documentsRequired: 0,
    },
  });
}
