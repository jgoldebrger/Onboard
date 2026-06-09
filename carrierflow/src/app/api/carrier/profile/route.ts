import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { handleApiError } from "@/app/api/admin/_utils";

export async function GET() {
  try {
    const user = await requirePermission("onboarding:own");

    const approved = await db.onboardingApplication.findFirst({
      where: { userId: user.id, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true },
    });

    if (!approved) {
      return NextResponse.json(
        { error: "Profile editing is available after approval" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      applicationId: approved.id,
      email: user.email,
      companyName: user.companyName,
      contactPhone: user.contactPhone,
      contactEmail: user.contactEmail,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requirePermission("onboarding:own");

    const approved = await db.onboardingApplication.findFirst({
      where: { userId: user.id, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (!approved) {
      return NextResponse.json(
        { error: "Profile editing is available after approval" },
        { status: 403 },
      );
    }

    const body = (await req.json()) as {
      companyName?: string;
      contactPhone?: string;
      contactEmail?: string;
    };

    const companyName = body.companyName?.trim() || null;
    const contactPhone = body.contactPhone?.trim() || null;
    const contactEmail = body.contactEmail?.trim() || null;

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { error: "Invalid contact email" },
        { status: 400 },
      );
    }

    const before = {
      companyName: user.companyName,
      contactPhone: user.contactPhone,
      contactEmail: user.contactEmail,
    };

    const updated = await db.user.update({
      where: { id: user.id },
      data: { companyName, contactPhone, contactEmail },
    });

    await auditLog({
      actorId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "CARRIER_PROFILE_UPDATE",
      before,
      after: {
        companyName: updated.companyName,
        contactPhone: updated.contactPhone,
        contactEmail: updated.contactEmail,
      },
    });

    return NextResponse.json({
      applicationId: approved.id,
      email: updated.email,
      companyName: updated.companyName,
      contactPhone: updated.contactPhone,
      contactEmail: updated.contactEmail,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
