import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";
import { AuditTable, type AuditLogRow } from "../_components/tables/audit-table";

export default async function AuditPage() {
  await requireAdminPage("audit:read");

  const logs = await db.auditLog.findMany({
    include: { actor: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows: AuditLogRow[] = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    actorEmail: log.actor?.email ?? "system",
    entityType: log.entityType,
    action: log.action,
    entityId: log.entityId,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <p className="text-sm text-muted-foreground">
        Latest {rows.length} admin actions (config changes, etc.).
      </p>
      <AuditTable data={rows} />
    </div>
  );
}
