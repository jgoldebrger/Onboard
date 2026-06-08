import { ApplicationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "../_utils";

export async function GET(req: Request) {
  try {
    await requirePermission("applications:read");
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const carrierTypeId = searchParams.get("carrierTypeId") ?? undefined;

    const status =
      statusParam &&
      Object.values(ApplicationStatus).includes(statusParam as ApplicationStatus)
        ? (statusParam as ApplicationStatus)
        : undefined;

    const applications = await db.onboardingApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(carrierTypeId ? { carrierTypeId } : {}),
      },
      include: {
        user: { select: { id: true, email: true, companyName: true } },
        carrierType: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      applications.map((app) => ({
        id: app.id,
        status: app.status,
        carrierTypeId: app.carrierTypeId,
        carrierType: app.carrierType,
        riskScore: app.riskScore,
        riskLevel: app.riskLevel,
        submittedAt: app.submittedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        user: app.user,
      })),
    );
  } catch (err) {
    return handleApiError(err);
  }
}
