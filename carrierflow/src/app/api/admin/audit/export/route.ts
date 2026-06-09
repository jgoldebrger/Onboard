import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractFraudFromAuditPayload } from "@/lib/fraud/waiver";
import type { FraudLevel } from "@/lib/fraud/score";
import { handleApiError } from "../../_utils";

function csvEscape(value: string | null | undefined): string {
  const s = value ?? "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const FRAUD_LEVELS = new Set(["low", "medium", "high", "critical"]);

export async function GET(req: Request) {
  try {
    await requirePermission("audit:read");
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") ?? undefined;
    const fraudLevel = searchParams.get("fraudLevel") ?? "";
    const fraudOnly = searchParams.get("fraudOnly") === "true";
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "5000", 10) || 5000,
      10000,
    );

    const logs = await db.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
      },
      include: { actor: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const rows = logs
      .map((log) => {
        const fraud =
          extractFraudFromAuditPayload(log.after) ??
          extractFraudFromAuditPayload(log.before);

        return {
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          actorEmail: log.actor?.email ?? "system",
          entityType: log.entityType,
          entityId: log.entityId,
          action: log.action,
          fraudScore: fraud?.fraudScore ?? null,
          fraudLevel: (fraud?.fraudLevel as FraudLevel | undefined) ?? null,
        };
      })
      .filter((row) => {
        if (fraudOnly && row.fraudScore == null) return false;
        if (fraudLevel && FRAUD_LEVELS.has(fraudLevel)) {
          if (row.fraudLevel !== fraudLevel) return false;
        }
        return true;
      });

    const headers = [
      "id",
      "created_at",
      "actor_email",
      "entity_type",
      "entity_id",
      "action",
      "fraud_score",
      "fraud_level",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.id,
          row.createdAt,
          row.actorEmail,
          row.entityType,
          row.entityId,
          row.action,
          row.fraudScore != null ? String(row.fraudScore) : "",
          row.fraudLevel ?? "",
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
