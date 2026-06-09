import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  findIdleInProgressApplications,
  sendAllIdleOnboardingReminders,
} from "@/lib/applications/idle-reminders";
import { handleApiError } from "../../_utils";

export async function GET() {
  try {
    await requirePermission("applications:read");
    const idle = await findIdleInProgressApplications();
    return NextResponse.json({
      count: idle.length,
      applications: idle.map((app) => ({
        id: app.id,
        email: app.user.email,
        companyName: app.user.companyName,
        updatedAt: app.updatedAt.toISOString(),
        lastReminderAt: app.lastOnboardingReminderAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST() {
  try {
    await requirePermission("applications:approve");
    const results = await sendAllIdleOnboardingReminders();
    const sent = results.filter((r) => r.sent).length;
    return NextResponse.json({ sent, total: results.length, results });
  } catch (err) {
    return handleApiError(err);
  }
}
