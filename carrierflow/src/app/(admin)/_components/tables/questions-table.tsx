"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type QuestionRow = {
  id: string;
  key: string;
  label: string;
  type: string;
  validatorLabel: string;
  isActive: boolean;
};

const columns: DataTableColumn<QuestionRow>[] = [
  {
    id: "key",
    header: "Key",
    cell: (row) => (
      <span className="font-mono text-xs">{row.key}</span>
    ),
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
    id: "type",
    header: "Type",
    cell: (row) => row.type,
    sortValue: (row) => row.type,
  },
  {
    id: "validator",
    header: "Validator",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{row.validatorLabel}</span>
    ),
    sortValue: (row) => row.validatorLabel,
  },
  {
    id: "active",
    header: "Active",
    cell: (row) => (row.isActive ? "Yes" : "No"),
    sortValue: (row) => row.isActive,
  },
  {
    id: "actions",
    header: "",
    sortable: false,
    cell: (row) => (
      <Link
        href={`/questions/${row.id}/edit`}
        className="text-primary hover:underline"
      >
        Edit
      </Link>
    ),
    defaultVisible: true,
  },
];

export function QuestionsTable({ data }: { data: QuestionRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No questions found."
      filterPlaceholder="Filter questions…"
    />
  );
}
