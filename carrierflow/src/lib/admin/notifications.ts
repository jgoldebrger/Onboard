import { db } from "@/lib/db";

export async function getAdminNotificationCounts() {
  const [openComplianceAlerts, pendingReview] = await Promise.all([
    db.complianceAlert.count({ where: { status: "OPEN" } }),
    db.onboardingApplication.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  return {
    totalUnread: openComplianceAlerts + pendingReview,
    openComplianceAlerts,
    pendingReview,
  };
}
