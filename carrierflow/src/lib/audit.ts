import { db } from "@/lib/db";

export type AuditLogInput = {
  actorId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
};

export async function auditLog(input: AuditLogInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      before: input.before as object | undefined,
      after: input.after as object | undefined,
      ipAddress: input.ipAddress,
    },
  });
}
