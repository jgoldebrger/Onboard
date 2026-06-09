"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { FraudLevel } from "@/lib/fraud/score";

export type AuditLogRow = {
  id: string;
  createdAt: string;
  actorEmail: string;
  entityType: string;
  action: string;
  entityId: string;
  fraudScore: number | null;
  fraudLevel: FraudLevel | null;
};

const columns: DataTableColumn<AuditLogRow>[] = [
  {
    id: "time",
    header: "Time",
    cell: (row) => (
      <span className="whitespace-nowrap text-xs">
        {new Date(row.createdAt).toLocaleString()}
      </span>
    ),
    sortValue: (row) => row.createdAt,
  },
  {
    id: "actor",
    header: "Actor",
    cell: (row) => <span className="text-xs">{row.actorEmail}</span>,
    sortValue: (row) => row.actorEmail,
  },
  {
    id: "entity",
    header: "Entity",
    cell: (row) => row.entityType,
    sortValue: (row) => row.entityType,
  },
  {
    id: "action",
    header: "Action",
    cell: (row) => row.action,
    sortValue: (row) => row.action,
  },
  {
    id: "fraud",
    header: "Fraud",
    cell: (row) =>
      row.fraudScore != null ? (
        <span className="text-xs">
          {row.fraudScore} ({row.fraudLevel ?? "—"})
        </span>
      ) : (
        "—"
      ),
    sortValue: (row) => row.fraudScore ?? -1,
    filterValue: (row) => row.fraudLevel ?? "",
  },
  {
    id: "id",
    header: "ID",
    cell: (row) => (
      <span className="max-w-[12rem] truncate font-mono text-xs">{row.entityId}</span>
    ),
    sortValue: (row) => row.entityId,
    cellClassName: "font-mono text-xs",
  },
];

export function AuditTable({ data }: { data: AuditLogRow[] }) {
  const [fraudLevelFilter, setFraudLevelFilter] = useState("");
  const [fraudOnly, setFraudOnly] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (fraudOnly && row.fraudScore == null) return false;
      if (fraudLevelFilter && row.fraudLevel !== fraudLevelFilter) return false;
      return true;
    });
  }, [data, fraudLevelFilter, fraudOnly]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (fraudLevelFilter) params.set("fraudLevel", fraudLevelFilter);
    if (fraudOnly) params.set("fraudOnly", "true");
    const qs = params.toString();
    return `/api/admin/audit/export${qs ? `?${qs}` : ""}`;
  }, [fraudLevelFilter, fraudOnly]);

  const toolbar = (
    <>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Fraud level</span>
        <select
          className="rounded-md border border-input bg-card px-2 py-1 text-foreground"
          value={fraudLevelFilter}
          onChange={(e) => setFraudLevelFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={fraudOnly}
          onChange={(e) => setFraudOnly(e.target.checked)}
        />
        Fraud events only
      </label>
      <Button type="button" variant="outline" size="sm" asChild>
        <a href={exportHref}>Export CSV</a>
      </Button>
    </>
  );

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No audit entries yet."
      filterPlaceholder="Filter audit log…"
      toolbar={toolbar}
      defaultPageSize={25}
    />
  );
}
