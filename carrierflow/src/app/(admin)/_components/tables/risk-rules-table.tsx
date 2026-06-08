"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type RiskRuleRow = {
  id: string;
  key: string;
  label: string;
  points: number;
  isEnabled: boolean;
};

const columns: DataTableColumn<RiskRuleRow>[] = [
  {
    id: "key",
    header: "Key",
    cell: (row) => <span className="font-mono text-xs">{row.key}</span>,
    sortValue: (row) => row.key,
    cellClassName: "font-mono text-xs",
  },
  {
    id: "label",
    header: "Label",
    cell: (row) => row.label,
    sortValue: (row) => row.label,
  },
  {
    id: "points",
    header: "Points",
    cell: (row) => row.points,
    sortValue: (row) => row.points,
  },
  {
    id: "enabled",
    header: "Enabled",
    cell: (row) => (row.isEnabled ? "Yes" : "No"),
    sortValue: (row) => row.isEnabled,
  },
  {
    id: "actions",
    header: "",
    sortable: false,
    cell: (row) => (
      <Link
        href={`/risk-rules/${row.id}/edit`}
        className="text-primary hover:underline"
      >
        Edit
      </Link>
    ),
  },
];

export function RiskRulesTable({ data }: { data: RiskRuleRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No risk rules found."
      filterPlaceholder="Filter risk rules…"
    />
  );
}
