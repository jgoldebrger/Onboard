"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type AuditLogRow = {
  id: string;
  createdAt: string;
  actorEmail: string;
  entityType: string;
  action: string;
  entityId: string;
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
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No audit entries yet."
      filterPlaceholder="Filter audit log…"
      defaultPageSize={25}
    />
  );
}
