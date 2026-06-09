import type { ComplianceAlertType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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

  return db.complianceAlert.create({
    data: {
      carrierProfileId: params.carrierProfileId,
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
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
