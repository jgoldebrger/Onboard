import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function assertApplicationOwner(
  applicationId: string,
  userId: string,
) {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, status: true },
  });

  if (!application) {
    return {
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  if (application.userId !== userId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { application };
}
