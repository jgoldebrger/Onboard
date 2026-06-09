import type { ComplianceAlertType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { complianceAlertEmail } from "@/lib/email";

async function notifyComplianceAlertEmail(
  carrierProfileId: string,
  alert: { title: string; message: string | null },
) {
  const profile = await db.carrierProfile.findUnique({
    where: { id: carrierProfileId },
    include: {
      application: {
        select: {
          user: { select: { email: true, companyName: true } },
        },
      },
    },
  });
  if (!profile) return;

  const carrierLabel =
    profile.legalName ??
    profile.application.user.companyName ??
    profile.application.user.email;

  await complianceAlertEmail({
    carrierLabel,
    dotNumber: profile.dotNumber,
    alertTitle: alert.title,
    alertMessage: alert.message ?? undefined,
    qualificationStatus: profile.qualificationStatus,
  });
}

export async function createComplianceAlert(params: {
  carrierProfileId: string;
  type: ComplianceAlertType;
  severity: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}) {
  const existing = await db.complianceAlert.findFirst({
    where: {
      carrierProfileId: params.carrierProfileId,
      type: params.type,
      status: "OPEN",
      title: params.title,
    },
  });
  if (existing) return existing;

  const alert = await db.complianceAlert.create({
    data: {
      carrierProfileId: params.carrierProfileId,
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  void notifyComplianceAlertEmail(params.carrierProfileId, alert).catch(
    (err) => console.error("Compliance alert email failed", alert.id, err),
  );

  return alert;
}

export async function acknowledgeAlert(
  alertId: string,
  actorId: string,
  notes?: string,
) {
  return db.complianceAlert.update({
    where: { id: alertId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedById: actorId,
      acknowledgedNotes: notes,
    },
  });
}

export async function listOpenAlerts(limit = 100) {
  return db.complianceAlert.findMany({
    where: { status: "OPEN" },
    include: {
      carrierProfile: {
        include: {
          application: {
            select: {
              id: true,
              user: { select: { email: true, companyName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
