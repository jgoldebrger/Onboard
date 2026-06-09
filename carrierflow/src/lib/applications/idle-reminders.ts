import { onboardingReminderEmail } from "@/lib/email";
import { db } from "@/lib/db";

const DEFAULT_IDLE_DAYS = 7;
const REMINDER_COOLDOWN_DAYS = 7;

export function idleReminderCutoff(idleDays = DEFAULT_IDLE_DAYS): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - idleDays);
  return cutoff;
}

export function reminderCooldownCutoff(cooldownDays = REMINDER_COOLDOWN_DAYS): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cooldownDays);
  return cutoff;
}

export async function findIdleInProgressApplications() {
  const updatedBefore = idleReminderCutoff();
  const remindedBefore = reminderCooldownCutoff();

  return db.onboardingApplication.findMany({
    where: {
      status: "IN_PROGRESS",
      updatedAt: { lt: updatedBefore },
      OR: [
        { lastOnboardingReminderAt: null },
        { lastOnboardingReminderAt: { lt: remindedBefore } },
      ],
    },
    include: {
      user: { select: { email: true, companyName: true } },
    },
  });
}

export async function sendOnboardingReminder(applicationId: string) {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: { user: { select: { email: true, companyName: true } } },
  });

  if (!application || application.status !== "IN_PROGRESS") {
    return { sent: false, reason: "not_in_progress" as const };
  }

  const company =
    application.user.companyName ?? "your carrier application";
  const result = await onboardingReminderEmail({
    to: application.user.email,
    companyLabel: company,
    applicationId: application.id,
  });

  if (result.sent) {
    await db.onboardingApplication.update({
      where: { id: applicationId },
      data: { lastOnboardingReminderAt: new Date() },
    });
  }

  return { sent: result.sent, reason: result.sent ? null : "email_skipped" };
}

export async function sendAllIdleOnboardingReminders() {
  const idle = await findIdleInProgressApplications();
  const results = [];

  for (const app of idle) {
    const outcome = await sendOnboardingReminder(app.id);
    results.push({
      applicationId: app.id,
      email: app.user.email,
      ...outcome,
    });
  }

  return results;
}
